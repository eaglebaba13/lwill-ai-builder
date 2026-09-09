import { describe, expect, it, vi } from "vitest";
import { createAiProjectService } from "./ai-project-service";

function createFixture() {
  type AiProjectState = {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    status: string;
    metadata: Record<string, unknown> | null;
  };
  const state = {
    projects: new Map<string, AiProjectState>(),
  };
  const prisma = {
    aiProject: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `project-${Date.now()}`,
          tenantId: data.tenantId as string,
          name: data.name as string,
          description: (data.description as string | null) ?? null,
          status: (data.status as string) ?? "active",
          metadata: (data.metadata as Record<string, unknown> | null) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.projects.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        state.projects.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.projects.values()].filter((p) => where?.tenantId === undefined || p.tenantId === where.tenantId)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const existing = state.projects.get(where.id);
        if (!existing) {
          return null;
        }
        const updated = { ...existing, ...data } as AiProjectState;
        state.projects.set(where.id, updated);
        return updated;
      }),
    },
  };
  return { prisma, state };
}

describe("ai-project service", () => {
  it("creates a project with default status active", async () => {
    const { prisma } = createFixture();
    const service = createAiProjectService(prisma as never);

    const project = await service.createProject({
      tenantId: "tenant-1",
      name: "AI App",
    });

    expect(project.name).toBe("AI App");
    expect(project.status).toBe("active");
    expect(prisma.aiProject.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for missing project", async () => {
    const { prisma } = createFixture();
    const service = createAiProjectService(prisma as never);

    const project = await service.getProject({ tenantId: "tenant-1", projectId: "missing" });

    expect(project).toBeNull();
  });

  it("rejects cross-tenant access", async () => {
    const { prisma, state } = createFixture();
    state.projects.set("project-1", {
      id: "project-1",
      tenantId: "tenant-2",
      name: "Other",
      description: null,
      status: "active",
      metadata: null,
    });
    const service = createAiProjectService(prisma as never);

    const project = await service.getProject({ tenantId: "tenant-1", projectId: "project-1" });

    expect(project).toBeNull();
  });

  it("lists projects scoped to tenant", async () => {
    const { prisma, state } = createFixture();
    state.projects.set("project-1", { id: "project-1", tenantId: "tenant-1", name: "A", description: null, status: "active", metadata: null });
    state.projects.set("project-2", { id: "project-2", tenantId: "tenant-2", name: "B", description: null, status: "active", metadata: null });
    const service = createAiProjectService(prisma as never);

    const projects = await service.listProjects({ tenantId: "tenant-1" });

    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe("project-1");
  });

  it("updates a project within the same tenant", async () => {
    const { prisma, state } = createFixture();
    state.projects.set("project-1", { id: "project-1", tenantId: "tenant-1", name: "A", description: null, status: "active", metadata: null });
    const service = createAiProjectService(prisma as never);

    const updated = await service.updateProject({
      tenantId: "tenant-1",
      projectId: "project-1",
      input: { name: "Updated", status: "archived" },
    });

    expect(updated?.name).toBe("Updated");
    expect(updated?.status).toBe("archived");
  });

  it("rejects cross-tenant update", async () => {
    const { prisma, state } = createFixture();
    state.projects.set("project-1", { id: "project-1", tenantId: "tenant-2", name: "A", description: null, status: "active", metadata: null });
    const service = createAiProjectService(prisma as never);

    const updated = await service.updateProject({
      tenantId: "tenant-1",
      projectId: "project-1",
      input: { name: "Hacked" },
    });

    expect(updated).toBeNull();
    expect(prisma.aiProject.update).not.toHaveBeenCalled();
  });
});
