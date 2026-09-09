import { describe, expect, it, vi } from "vitest";
import { createAiSessionService } from "./ai-session-service";

function createFixture() {
  type AiSessionState = {
    id: string;
    tenantId: string;
    projectId: string;
    userId: string | null;
    title: string;
  };
  const state = {
    sessions: new Map<string, AiSessionState>(),
  };
  const prisma = {
    aiSession: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `session-${Date.now()}`,
          tenantId: data.tenantId as string,
          projectId: data.projectId as string,
          userId: (data.userId as string | null) ?? null,
          title: data.title as string,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.sessions.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.sessions.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string; projectId?: string } }) =>
        [...state.sessions.values()].filter((s) => {
          if (where?.tenantId && s.tenantId !== where.tenantId) return false;
          if (where?.projectId && s.projectId !== where.projectId) return false;
          return true;
        })),
    },
  };
  return { prisma, state };
}

describe("ai-session service", () => {
  it("creates a session linked to a project", async () => {
    const { prisma } = createFixture();
    const service = createAiSessionService(prisma as never);

    const session = await service.createSession({
      tenantId: "tenant-1",
      projectId: "project-1",
      title: "Chat 1",
    });

    expect(session.projectId).toBe("project-1");
    expect(session.title).toBe("Chat 1");
    expect(prisma.aiSession.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for missing session", async () => {
    const { prisma } = createFixture();
    const service = createAiSessionService(prisma as never);

    const session = await service.getSession({ tenantId: "tenant-1", sessionId: "missing" });

    expect(session).toBeNull();
  });

  it("rejects cross-tenant access", async () => {
    const { prisma, state } = createFixture();
    state.sessions.set("session-1", { id: "session-1", tenantId: "tenant-2", projectId: "project-1", userId: null, title: "Other" });
    const service = createAiSessionService(prisma as never);

    const session = await service.getSession({ tenantId: "tenant-1", sessionId: "session-1" });

    expect(session).toBeNull();
  });

  it("lists sessions scoped to tenant and optional project", async () => {
    const { prisma, state } = createFixture();
    state.sessions.set("session-1", { id: "session-1", tenantId: "tenant-1", projectId: "project-1", userId: null, title: "A" });
    state.sessions.set("session-2", { id: "session-2", tenantId: "tenant-1", projectId: "project-2", userId: null, title: "B" });
    state.sessions.set("session-3", { id: "session-3", tenantId: "tenant-2", projectId: "project-1", userId: null, title: "C" });
    const service = createAiSessionService(prisma as never);

    const all = await service.listSessions({ tenantId: "tenant-1" });
    expect(all).toHaveLength(2);

    const filtered = await service.listSessions({ tenantId: "tenant-1", projectId: "project-1" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("session-1");
  });
});
