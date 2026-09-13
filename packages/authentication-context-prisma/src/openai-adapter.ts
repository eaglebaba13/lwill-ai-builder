import type { AiProviderAdapter, AiCompletionRequest, AiCompletionResponse } from "./ai-provider-adapter";

export interface OpenAIAdapterConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
}

interface OpenAIChatCompletionResponse {
  readonly id: string;
  readonly choices: ReadonlyArray<{
    readonly message: { readonly content: string };
    readonly finish_reason: string | null;
  }>;
  readonly usage: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
  };
  readonly model: string;
}

export function createOpenAIAdapter(config: OpenAIAdapterConfig): AiProviderAdapter {
  const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";

  return {
    name: "openai",

    isAvailable(): boolean {
      return config.apiKey.length > 0;
    },

    async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
      const body = {
        model: request.model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
        ...(request.temperature !== undefined && { temperature: request.temperature }),
      };

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "unknown error");
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as OpenAIChatCompletionResponse;
      const choice = data.choices[0];

      return {
        content: choice?.message?.content ?? "",
        model: data.model,
        provider: "openai",
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
        finishReason: choice?.finish_reason ?? null,
      };
    },
  };
}
