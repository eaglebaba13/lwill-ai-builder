import { describe, expect, it, vi } from "vitest";
import { handleComplete, handleListProviders, type AiInferenceAuthorization, type AiInferenceRouteServices } from "../lib/ai/ai-inference-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/ai/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(auth: AiInferenceAuthorization): AiInferenceRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    complete: vi.fn().mockResolvedValue({
      content: "Hello!",
      model: "gpt-4o-mini",
      provider: "openai",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: "stop",
    }),
    getAvailableProviders: vi.fn().mockReturnValue([{ name: "openai", available: true }]),
  };
}

const authorized: AiInferenceAuthorization = { outcome: "authorized", tenantId: "t1", userId: "user-1" };

describe("ai-inference route handlers: auth gating", () => {
  it("returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] }), services)).status).toBe(401);
  });

  it("returns 403 for forbidden", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] }), services)).status).toBe(403);
  });

  it("uses ai.project.write permission", async () => {
    const services = createServices(authorized);
    await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] }), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.write");
  });
});

describe("ai-inference route handlers: validation", () => {
  it("returns 400 for missing model", async () => {
    const services = createServices(authorized);
    expect((await handleComplete(request({ messages: [{ role: "user", content: "Hello" }] }), services)).status).toBe(400);
  });

  it("returns 400 for missing messages", async () => {
    const services = createServices(authorized);
    expect((await handleComplete(request({ model: "gpt-4o-mini" }), services)).status).toBe(400);
  });

  it("returns 400 for empty messages", async () => {
    const services = createServices(authorized);
    expect((await handleComplete(request({ model: "gpt-4o-mini", messages: [] }), services)).status).toBe(400);
  });

  it("returns 400 for invalid message role", async () => {
    const services = createServices(authorized);
    expect((await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "invalid", content: "Hello" }] }), services)).status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }], unknown: true }), services)).status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const services = createServices(authorized);
    const badRequest = new Request("https://builder.lwill.in/api/ai/completions", { method: "POST", body: "not-json" });
    expect((await handleComplete(badRequest, services)).status).toBe(400);
  });
});

describe("ai-inference route handlers: success", () => {
  it("returns 200 with inference result", async () => {
    const services = createServices(authorized);
    const result = await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] }), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.content).toBe("Hello!");
    expect(body.provider).toBe("openai");
  });

  it("returns 503 for unavailable provider", async () => {
    const services = createServices(authorized);
    (services as { complete: unknown }).complete = vi.fn().mockRejectedValue(new Error("AI provider 'openai' is not available"));
    expect((await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] }), services)).status).toBe(503);
  });

  it("returns 502 for provider errors", async () => {
    const services = createServices(authorized);
    (services as { complete: unknown }).complete = vi.fn().mockRejectedValue(new Error("OpenAI API error (500)"));
    expect((await handleComplete(request({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] }), services)).status).toBe(502);
  });
});

describe("ai-inference route handlers: listProviders", () => {
  it("returns 200 with providers", async () => {
    const services = createServices(authorized);
    const result = await handleListProviders(new Request("https://builder.lwill.in/api/ai/providers"), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.providers).toHaveLength(1);
    expect(body.providers[0].name).toBe("openai");
  });

  it("uses ai.project.read permission", async () => {
    const services = createServices(authorized);
    await handleListProviders(new Request("https://builder.lwill.in/api/ai/providers"), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.read");
  });
});
