import { describe, expect, it, vi } from "vitest";
import {
  handleCreateProject,
  handleCreateSession,
  handleGetProject,
  handleGetProjectUsageSummary,
  handleGetSession,
  handleListProjects,
  handleListPromptsForSession,
  handleListSessions,
  handleRecordPrompt,
  handleRecordUsage,
  handleUpdateProject,
  type AiBuilderAuthorization,
  type AiBuilderRouteServices,
} from "../lib/ai/ai-builder-route-handlers";

function projectRequest(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/ai/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function sessionRequest(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/ai/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function promptRequest(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/ai/prompts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function usageRequest(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/ai/usage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: AiBuilderAuthorization): AiBuilderRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    createProject: vi.fn().mockResolvedValue({ id: "project-1" }),
    getProject: vi.fn().mockResolvedValue({ id: "project-1" }),
    listProjects: vi.fn().mockResolvedValue([{ id: "project-1" }]),
    updateProject: vi.fn().mockResolvedValue({ id: "project-1" }),
    createSession: vi.fn().mockResolvedValue({ id: "session-1" }),
    getSession: vi.fn().mockResolvedValue({ id: "session-1" }),
    listSessions: vi.fn().mockResolvedValue([{ id: "session-1" }]),
    recordPrompt: vi.fn().mockResolvedValue({ id: "prompt-1" }),
    listPromptsForSession: vi.fn().mockResolvedValue([{ id: "prompt-1" }]),
    recordUsage: vi.fn().mockResolvedValue({ id: "usage-1" }),
    getProjectUsageSummary: vi.fn().mockResolvedValue({ totalTokens: 100 }),
  };
}

describe("ai builder route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListProjects(projectRequest(), services)).status).toBe(401);
    expect((await handleCreateProject(projectRequest({ name: "AI Builder" }), services)).status).toBe(401);
    expect((await handleGetProject(projectRequest(), services, "p1")).status).toBe(401);
    expect((await handleUpdateProject(projectRequest({ name: "AI Builder" }), services, "p1")).status).toBe(401);
    expect((await handleListSessions(sessionRequest(), services)).status).toBe(401);
    expect((await handleCreateSession(sessionRequest({ projectId: "p1", title: "Session" }), services)).status).toBe(401);
    expect((await handleGetSession(projectRequest(), services, "s1")).status).toBe(401);
    expect((await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "s1", role: "user", content: "hello" }), services)).status).toBe(401);
    expect((await handleListPromptsForSession(projectRequest(), services, "s1")).status).toBe(401);
    expect((await handleRecordUsage(usageRequest({ provider: "openai", modelName: "gpt-4", promptTokens: 10, completionTokens: 20, totalTokens: 30, durationMs: 1000 }), services)).status).toBe(401);
    expect((await handleGetProjectUsageSummary(projectRequest(), services, "p1")).status).toBe(401);
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListProjects(projectRequest(), services)).status).toBe(403);
    expect((await handleCreateProject(projectRequest({ name: "AI Builder" }), services)).status).toBe(403);
    expect(services.createProject).not.toHaveBeenCalled();
  });
});

describe("ai builder route handlers: permission code forwarding", () => {
  it("passes 'ai.project.read' to authorize for read operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListProjects(projectRequest(), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.read");

    await handleGetProject(projectRequest(), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("ai.project.read");

    await handleListSessions(sessionRequest(), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.read");

    await handleGetSession(projectRequest(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("ai.project.read");

    await handleListPromptsForSession(projectRequest(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("ai.project.read");

    await handleGetProjectUsageSummary(projectRequest(), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("ai.project.read");
  });

  it("passes 'ai.project.write' to authorize for write operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateProject(projectRequest({ name: "AI Builder" }), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.write");

    await handleUpdateProject(projectRequest({ name: "AI Builder" }), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("ai.project.write");

    await handleCreateSession(sessionRequest({ projectId: "p1", title: "Session" }), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.write");

    await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "s1", role: "user", content: "hello" }), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.write");

    await handleRecordUsage(usageRequest({ provider: "openai", modelName: "gpt-4", promptTokens: 10, completionTokens: 20, totalTokens: 30, durationMs: 1000 }), services);
    expect(services.authorize).toHaveBeenCalledWith("ai.project.write");
  });
});

describe("ai builder route handlers: project input validation", () => {
  it("rejects invalid create project input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateProject(projectRequest({}), services)).status).toBe(400);
    expect((await handleCreateProject(projectRequest({ name: "" }), services)).status).toBe(400);
    expect((await handleCreateProject(projectRequest({ name: "AI Builder", unknown: true }), services)).status).toBe(400);
  });

  it("rejects invalid update project input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateProject(projectRequest({}), services, "p1")).status).toBe(400);
    expect((await handleUpdateProject(projectRequest({ name: "" }), services, "p1")).status).toBe(400);
    expect((await handleUpdateProject(projectRequest({ name: "AI Builder", unknown: true }), services, "p1")).status).toBe(400);
  });

  it("accepts valid create project input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateProject(
      projectRequest({ name: "AI Builder", description: "Desc", status: "active", metadata: { key: "value" } }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createProject).toHaveBeenCalledWith("tenant-1", {
      name: "AI Builder",
      description: "Desc",
      status: "active",
      metadata: { key: "value" },
    });
  });

  it("returns 404 for non-existent project", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getProject).mockResolvedValue(null);
    expect((await handleGetProject(projectRequest(), services, "missing")).status).toBe(404);
  });

  it("returns 404 when updating a non-existent project", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.updateProject).mockResolvedValue(null);
    expect((await handleUpdateProject(projectRequest({ name: "X" }), services, "missing")).status).toBe(404);
  });
});

describe("ai builder route handlers: session input validation", () => {
  it("rejects invalid create session input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateSession(sessionRequest({}), services)).status).toBe(400);
    expect((await handleCreateSession(sessionRequest({ projectId: "", title: "Session" }), services)).status).toBe(400);
    expect((await handleCreateSession(sessionRequest({ projectId: "p1", title: "" }), services)).status).toBe(400);
    expect((await handleCreateSession(sessionRequest({ projectId: "p1", title: "Session", unknown: true }), services)).status).toBe(400);
  });

  it("accepts valid create session input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateSession(
      sessionRequest({ projectId: "p1", userId: "user-1", title: "Session" }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createSession).toHaveBeenCalledWith("tenant-1", {
      projectId: "p1",
      userId: "user-1",
      title: "Session",
    });
  });

  it("returns 404 for non-existent session", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getSession).mockResolvedValue(null);
    expect((await handleGetSession(projectRequest(), services, "missing")).status).toBe(404);
  });
});

describe("ai builder route handlers: prompt input validation", () => {
  it("rejects invalid record prompt input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleRecordPrompt(promptRequest({}), services)).status).toBe(400);
    expect((await handleRecordPrompt(promptRequest({ projectId: "", sessionId: "s1", role: "user", content: "hello" }), services)).status).toBe(400);
    expect((await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "", role: "user", content: "hello" }), services)).status).toBe(400);
    expect((await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "s1", role: "", content: "hello" }), services)).status).toBe(400);
    expect((await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "s1", role: "user", content: "" }), services)).status).toBe(400);
    expect((await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "s1", role: "user", content: "hello", tokenCount: -1 }), services)).status).toBe(400);
    expect((await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "s1", role: "user", content: "hello", tokenCount: 1.5 }), services)).status).toBe(400);
    expect((await handleRecordPrompt(promptRequest({ projectId: "p1", sessionId: "s1", role: "user", content: "hello", unknown: true }), services)).status).toBe(400);
  });

  it("accepts valid record prompt input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleRecordPrompt(
      promptRequest({ projectId: "p1", sessionId: "s1", role: "user", content: "hello", tokenCount: 5 }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.recordPrompt).toHaveBeenCalledWith("tenant-1", {
      projectId: "p1",
      sessionId: "s1",
      role: "user",
      content: "hello",
      tokenCount: 5,
    });
  });
});

describe("ai builder route handlers: model usage input validation", () => {
  it("rejects invalid record usage input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleRecordUsage(usageRequest({}), services)).status).toBe(400);
    expect((await handleRecordUsage(usageRequest({ provider: "", modelName: "gpt-4", promptTokens: 10, completionTokens: 20, totalTokens: 30, durationMs: 1000 }), services)).status).toBe(400);
    expect((await handleRecordUsage(usageRequest({ provider: "openai", modelName: "", promptTokens: 10, completionTokens: 20, totalTokens: 30, durationMs: 1000 }), services)).status).toBe(400);
    expect((await handleRecordUsage(usageRequest({ provider: "openai", modelName: "gpt-4", promptTokens: -1, completionTokens: 20, totalTokens: 30, durationMs: 1000 }), services)).status).toBe(400);
    expect((await handleRecordUsage(usageRequest({ provider: "openai", modelName: "gpt-4", promptTokens: 10, completionTokens: 20, totalTokens: 30, durationMs: 1000, unknown: true }), services)).status).toBe(400);
  });

  it("accepts valid record usage input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleRecordUsage(
      usageRequest({ projectId: "p1", provider: "openai", modelName: "gpt-4", promptTokens: 10, completionTokens: 20, totalTokens: 30, durationMs: 1000 }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.recordUsage).toHaveBeenCalledWith("tenant-1", {
      projectId: "p1",
      provider: "openai",
      modelName: "gpt-4",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      durationMs: 1000,
    });
  });

  it("returns 404 for non-existent project usage summary", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getProjectUsageSummary).mockResolvedValue(null);
    expect((await handleGetProjectUsageSummary(projectRequest(), services, "missing")).status).toBe(404);
  });
});

describe("ai builder route handlers: list sessions with query param", () => {
  it("parses projectId from query params", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const request = new Request("https://builder.lwill.in/api/ai/sessions?projectId=p1", {
      method: "GET",
    });
    await handleListSessions(request, services);
    expect(services.listSessions).toHaveBeenCalledWith("tenant-1", "p1");
  });

  it("passes undefined when projectId query param is absent", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const request = new Request("https://builder.lwill.in/api/ai/sessions", {
      method: "GET",
    });
    await handleListSessions(request, services);
    expect(services.listSessions).toHaveBeenCalledWith("tenant-1", undefined);
  });
});
