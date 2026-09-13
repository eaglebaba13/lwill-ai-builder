import { describe, expect, it, vi } from "vitest";
import { createAiInferenceService } from "./ai-inference-service";
import type { AiProviderAdapter, AiCompletionResponse } from "./ai-provider-adapter";

function createMockAdapter(name: string, available = true, response?: AiCompletionResponse): AiProviderAdapter {
  return {
    name,
    isAvailable: () => available,
    complete: vi.fn().mockResolvedValue(
      response ?? {
        content: "Hello! How can I help?",
        model: "gpt-4o-mini",
        provider: name,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: "stop",
      },
    ),
  };
}

function createMockUsageRecorder() {
  return { recordUsage: vi.fn().mockResolvedValue({}) };
}

describe("ai-inference-service: getAvailableProviders", () => {
  it("lists providers with availability", () => {
    const adapter = createMockAdapter("openai", true);
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    const providers = service.getAvailableProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual({ name: "openai", available: true });
  });

  it("reports unavailable providers", () => {
    const adapter = createMockAdapter("openai", false);
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    expect(service.getAvailableProviders()[0]?.available).toBe(false);
  });
});

describe("ai-inference-service: complete", () => {
  it("returns inference response from adapter", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    const result = await service.complete({
      tenantId: "t1",
      request: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] },
    });

    expect(result.content).toBe("Hello! How can I help?");
    expect(result.provider).toBe("openai");
    expect(result.usage.totalTokens).toBe(15);
    expect(adapter.complete).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }],
    });
  });

  it("records usage after successful inference", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    await service.complete({
      tenantId: "t1",
      request: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }], projectId: "proj-1" },
    });

    expect(recorder.recordUsage).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "t1",
      projectId: "proj-1",
      provider: "openai",
      modelName: "gpt-4o-mini",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    }));
  });

  it("does not fail inference when usage recording fails", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = { recordUsage: vi.fn().mockRejectedValue(new Error("DB error")) };
    const service = createAiInferenceService([adapter], recorder);

    const result = await service.complete({
      tenantId: "t1",
      request: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] },
    });

    expect(result.content).toBe("Hello! How can I help?");
  });

  it("throws for unknown provider", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    await expect(
      service.complete({ tenantId: "t1", request: { provider: "unknown", model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] } }),
    ).rejects.toThrow("Unknown AI provider: unknown");
  });

  it("throws for unavailable provider", async () => {
    const adapter = createMockAdapter("openai", false);
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    await expect(
      service.complete({ tenantId: "t1", request: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] } }),
    ).rejects.toThrow("not available");
  });

  it("throws for empty messages", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    await expect(
      service.complete({ tenantId: "t1", request: { model: "gpt-4o-mini", messages: [] } }),
    ).rejects.toThrow("At least one message is required");
  });

  it("filters invalid message roles", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    await service.complete({
      tenantId: "t1",
      request: {
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: "Hello" },
          { role: "invalid", content: "ignored" } as never,
        ],
      },
    });

    expect(adapter.complete).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }],
    });
  });

  it("uses default provider when none specified", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder, "openai");

    await service.complete({
      tenantId: "t1",
      request: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] },
    });

    expect(adapter.complete).toHaveBeenCalled();
  });

  it("passes maxTokens and temperature to adapter", async () => {
    const adapter = createMockAdapter("openai");
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([adapter], recorder);

    await service.complete({
      tenantId: "t1",
      request: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }], maxTokens: 100, temperature: 0.7 },
    });

    expect(adapter.complete).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }],
      maxTokens: 100,
      temperature: 0.7,
    });
  });

  it("throws when no adapters configured", async () => {
    const recorder = createMockUsageRecorder();
    const service = createAiInferenceService([], recorder);

    await expect(
      service.complete({ tenantId: "t1", request: { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] } }),
    ).rejects.toThrow("No AI provider configured");
  });
});
