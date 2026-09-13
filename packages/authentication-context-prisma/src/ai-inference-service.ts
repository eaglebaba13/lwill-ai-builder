import type { AiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from "./ai-provider-adapter";

export interface AiInferenceRequest {
  readonly provider?: string;
  readonly model: string;
  readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly projectId?: string | null;
}

export interface AiInferenceResponse {
  readonly content: string;
  readonly model: string;
  readonly provider: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly finishReason: string | null;
}

export interface ModelUsageRecorder {
  recordUsage(input: {
    tenantId: string;
    projectId?: string | null;
    provider: string;
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
  }): Promise<unknown>;
}

export interface AiInferenceService {
  complete(args: { tenantId: string; request: AiInferenceRequest }): Promise<AiInferenceResponse>;
  getAvailableProviders(): ReadonlyArray<{ name: string; available: boolean }>;
}

export function createAiInferenceService(
  adapters: ReadonlyArray<AiProviderAdapter>,
  usageRecorder: ModelUsageRecorder,
  defaultProvider?: string,
): AiInferenceService {
  const adapterMap = new Map(adapters.map((a) => [a.name, a]));

  return {
    getAvailableProviders() {
      return adapters.map((a) => ({ name: a.name, available: a.isAvailable() }));
    },

    async complete({ tenantId, request }) {
      const providerName = request.provider ?? defaultProvider ?? adapters[0]?.name;
      if (!providerName) {
        throw new Error("No AI provider configured");
      }

      const adapter = adapterMap.get(providerName);
      if (!adapter) {
        throw new Error(`Unknown AI provider: ${providerName}`);
      }

      if (!adapter.isAvailable()) {
        throw new Error(`AI provider '${providerName}' is not available`);
      }

      const validRoles = new Set(["system", "user", "assistant"]);
      const messages = request.messages
        .filter((m) => validRoles.has(m.role))
        .map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content }));

      if (messages.length === 0) {
        throw new Error("At least one message is required");
      }

      const completionRequest: AiCompletionRequest = {
        model: request.model,
        messages,
        ...(request.maxTokens !== undefined && { maxTokens: request.maxTokens }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
      };

      const startTime = Date.now();
      const response = await adapter.complete(completionRequest);
      const durationMs = Date.now() - startTime;

      try {
        await usageRecorder.recordUsage({
          tenantId,
          projectId: request.projectId ?? null,
          provider: response.provider,
          modelName: response.model,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          durationMs,
        });
      } catch {
        // Usage recording is best-effort — do not fail the inference
      }

      return {
        content: response.content,
        model: response.model,
        provider: response.provider,
        usage: response.usage,
        finishReason: response.finishReason,
      };
    },
  };
}
