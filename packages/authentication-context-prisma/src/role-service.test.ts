import { describe, expect, it, vi } from "vitest";
import { createRoleService } from "./role-service";

function createFixture() {
  type RoleState = {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    permissions: readonly { id: string; code: string; description: string | null }[];
  };
  const state = {
    roles: new Map<string, RoleState>(),
  };
  const prisma = {
    role: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        [...state.roles.values()].filter((r) => r.tenantId === where.tenantId),
      ),
      findUnique: vi.fn(async ({ where }: { where: { tenantId_id: { tenantId: string; id: string } } }) =>
        [...state.roles.values()].find((r) => r.tenantId === where.tenantId_id.tenantId && r.id === where.tenantId_id.id) ?? null,
      ),
      update: vi.fn(async ({ where, data }: { where: { tenantId_id: { tenantId: string; id: string } }; data: Record<string, unknown> }) => {
        const existing = [...state.roles.values()].find((r) => r.tenantId === where.tenantId_id.tenantId && r.id === where.tenantId_id.id);
        if (!existing) {
          throw new Error("not found");
        }
        const updated = { ...existing, ...data } as RoleState;
        state.roles.set(updated.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }: { where: { tenantId_id: { tenantId: string; id: string } } }) => {
        const existing = [...state.roles.values()].find((r) => r.tenantId === where.tenantId_id.tenantId && r.id === where.tenantId_id.id);
        if (!existing) {
          throw new Error("not found");
        }
        state.roles.delete(existing.id);
        return existing;
      }),
    },
  };
  return { prisma, state };
}

describe("role service (tenant-scoped)", () => {
  it("lists only roles belonging to the requesting tenant", async () => {
    const { prisma, state } = createFixture();
    state.roles.set("role-1", {
      id: "role-1", tenantId: "tenant-1", code: "r1", name: "Role 1", description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), permissions: [],
    });
    state.roles.set("role-2", {
      id: "role-2", tenantId: "tenant-2", code: "r2", name: "Role 2", description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), permissions: [],
    });
    const service = createRoleService(prisma as never);

    const roles = await service.listRoles({ tenantId: "tenant-1" });

    expect(roles).toHaveLength(1);
    expect(roles[0]?.id).toBe("role-1");
  });

  it("returns a role with permissions when found", async () => {
    const { prisma, state } = createFixture();
    state.roles.set("role-1", {
      id: "role-1", tenantId: "tenant-1", code: "r1", name: "Role 1", description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date(),
      permissions: [{ id: "perm-1", code: "perm.read", description: null }],
    });
    const service = createRoleService(prisma as never);

    const role = await service.getRole({ tenantId: "tenant-1", roleId: "role-1" });

    expect(role?.id).toBe("role-1");
    expect(role?.permissions).toHaveLength(1);
  });

  it("returns null when the role is not in the tenant", async () => {
    const { prisma } = createFixture();
    const service = createRoleService(prisma as never);

    const role = await service.getRole({ tenantId: "tenant-1", roleId: "missing" });

    expect(role).toBeNull();
  });

  it("updates a non-system role", async () => {
    const { prisma, state } = createFixture();
    state.roles.set("role-1", {
      id: "role-1", tenantId: "tenant-1", code: "r1", name: "Role 1", description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), permissions: [],
    });
    const service = createRoleService(prisma as never);

    const updated = await service.updateRole({
      tenantId: "tenant-1",
      roleId: "role-1",
      input: { name: "New Name", isActive: false },
    });

    expect(updated?.name).toBe("New Name");
    expect(updated?.isActive).toBe(false);
  });

  it("throws when updating tenant-admin role", async () => {
    const { prisma, state } = createFixture();
    state.roles.set("role-1", {
      id: "role-1", tenantId: "tenant-1", code: "tenant-admin", name: "Tenant Admin", description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), permissions: [],
    });
    const service = createRoleService(prisma as never);

    await expect(service.updateRole({
      tenantId: "tenant-1",
      roleId: "role-1",
      input: { name: "Hacked" },
    })).rejects.toThrow("Cannot modify protected tenant-admin role");
  });

  it("deletes a non-system role", async () => {
    const { prisma, state } = createFixture();
    state.roles.set("role-1", {
      id: "role-1", tenantId: "tenant-1", code: "r1", name: "Role 1", description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), permissions: [],
    });
    const service = createRoleService(prisma as never);

    const deleted = await service.deleteRole({ tenantId: "tenant-1", roleId: "role-1" });

    expect(deleted).toBe(true);
    expect(state.roles.has("role-1")).toBe(false);
  });

  it("throws when deleting tenant-admin role", async () => {
    const { prisma, state } = createFixture();
    state.roles.set("role-1", {
      id: "role-1", tenantId: "tenant-1", code: "tenant-admin", name: "Tenant Admin", description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), permissions: [],
    });
    const service = createRoleService(prisma as never);

    await expect(service.deleteRole({ tenantId: "tenant-1", roleId: "role-1" })).rejects.toThrow("Cannot delete protected role");
  });
});
