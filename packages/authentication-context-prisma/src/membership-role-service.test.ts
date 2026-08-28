import { describe, expect, it, vi } from "vitest";
import { createMembershipRoleService } from "./membership-role-service";

function createFixture() {
  type MembershipState = { id: string; tenantId: string; userId: string };
  type RoleState = { id: string; tenantId: string };
  type BusinessUnitState = { id: string; tenantId: string };
  type BranchState = { id: string; tenantId: string };
  const state = {
    memberships: new Map<string, MembershipState>(),
    roles: new Map<string, RoleState>(),
    businessUnits: new Map<string, BusinessUnitState>(),
    branches: new Map<string, BranchState>(),
    tenantRoles: new Map<string, { id: string }>(),
    buRoles: new Map<string, { id: string }>(),
    branchRoles: new Map<string, { id: string }>(),
  };
  const prisma = {
    tenantMembership: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; id: string } }) =>
        [...state.memberships.values()].find((m) => m.tenantId === where.tenantId && m.id === where.id) ?? null,
      ),
    },
    role: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; id: string } }) =>
        [...state.roles.values()].find((r) => r.tenantId === where.tenantId && r.id === where.id) ?? null,
      ),
    },
    businessUnit: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; id: string } }) =>
        [...state.businessUnits.values()].find((b) => b.tenantId === where.tenantId && b.id === where.id) ?? null,
      ),
    },
    branch: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; id: string } }) =>
        [...state.branches.values()].find((b) => b.tenantId === where.tenantId && b.id === where.id) ?? null,
      ),
    },
    membershipRole: {
      create: vi.fn(async ({ data }: { data: { tenantId: string; membershipId: string; roleId: string } }) => {
        const id = `mr-${Math.random()}`;
        state.tenantRoles.set(id, { id });
        return { id };
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
        [...state.tenantRoles.entries()].find(([, v]) => v.id === where.id) ?.[1] ?? null,
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        state.tenantRoles.delete(where.id);
        return { id: where.id };
      }),
    },
    businessUnitMembershipRole: {
      create: vi.fn(async ({ data }: { data: { tenantId: string; membershipId: string; roleId: string; businessUnitId: string } }) => {
        const id = `bu-${Math.random()}`;
        state.buRoles.set(id, { id });
        return { id };
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
        [...state.buRoles.entries()].find(([, v]) => v.id === where.id) ?.[1] ?? null,
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        state.buRoles.delete(where.id);
        return { id: where.id };
      }),
    },
    branchMembershipRole: {
      create: vi.fn(async ({ data }: { data: { tenantId: string; membershipId: string; roleId: string; businessUnitId: string; branchId: string } }) => {
        const id = `br-${Math.random()}`;
        state.branchRoles.set(id, { id });
        return { id };
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
        [...state.branchRoles.entries()].find(([, v]) => v.id === where.id) ?.[1] ?? null,
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        state.branchRoles.delete(where.id);
        return { id: where.id };
      }),
    },
  };
  return { prisma, state };
}

describe("membership-role service (tenant-scoped)", () => {
  it("assigns a tenant-scoped role to a membership", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-1", userId: "user-1" });
    state.roles.set("r-1", { id: "r-1", tenantId: "tenant-1" });
    const service = createMembershipRoleService(prisma as never);

    const assignment = await service.assignRole({
      tenantId: "tenant-1",
      membershipId: "m-1",
      roleId: "r-1",
      scope: { kind: "tenant" },
    });

    expect(assignment.scope.kind).toBe("tenant");
    expect(assignment.membershipId).toBe("m-1");
    expect(assignment.roleId).toBe("r-1");
  });

  it("assigns a business-unit-scoped role to a membership", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-1", userId: "user-1" });
    state.roles.set("r-1", { id: "r-1", tenantId: "tenant-1" });
    state.businessUnits.set("bu-1", { id: "bu-1", tenantId: "tenant-1" });
    const service = createMembershipRoleService(prisma as never);

    const assignment = await service.assignRole({
      tenantId: "tenant-1",
      membershipId: "m-1",
      roleId: "r-1",
      scope: { kind: "business-unit", businessUnitId: "bu-1" },
    });

    expect(assignment.scope.kind).toBe("business-unit");
    expect((assignment.scope as { kind: "business-unit"; businessUnitId: string }).businessUnitId).toBe("bu-1");
  });

  it("assigns a branch-scoped role to a membership", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-1", userId: "user-1" });
    state.roles.set("r-1", { id: "r-1", tenantId: "tenant-1" });
    state.businessUnits.set("bu-1", { id: "bu-1", tenantId: "tenant-1" });
    state.branches.set("b-1", { id: "b-1", tenantId: "tenant-1" });
    const service = createMembershipRoleService(prisma as never);

    const assignment = await service.assignRole({
      tenantId: "tenant-1",
      membershipId: "m-1",
      roleId: "r-1",
      scope: { kind: "branch", businessUnitId: "bu-1", branchId: "b-1" },
    });

    expect(assignment.scope.kind).toBe("branch");
    expect((assignment.scope as { kind: "branch"; businessUnitId: string; branchId: string }).branchId).toBe("b-1");
  });

  it("throws when membership does not belong to tenant", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-2", userId: "user-1" });
    state.roles.set("r-1", { id: "r-1", tenantId: "tenant-1" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "tenant-1",
      membershipId: "m-1",
      roleId: "r-1",
      scope: { kind: "tenant" },
    })).rejects.toThrow("Membership not found in tenant");
  });

  it("throws when role does not belong to tenant", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "tenant-1", userId: "user-1" });
    state.roles.set("r-1", { id: "r-1", tenantId: "tenant-2" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "tenant-1",
      membershipId: "m-1",
      roleId: "r-1",
      scope: { kind: "tenant" },
    })).rejects.toThrow("Role not found in tenant");
  });

  it("removes a tenant-scoped role assignment", async () => {
    const { prisma, state } = createFixture();
    state.tenantRoles.set("assign-1", { id: "assign-1" });
    const service = createMembershipRoleService(prisma as never);

    const removed = await service.removeRole({
      tenantId: "tenant-1",
      assignmentId: "assign-1",
      scope: { kind: "tenant" },
    });

    expect(removed).toBe(true);
    expect(state.tenantRoles.has("assign-1")).toBe(false);
  });

  it("returns false when removing a non-existent assignment", async () => {
    const { prisma } = createFixture();
    const service = createMembershipRoleService(prisma as never);

    const removed = await service.removeRole({
      tenantId: "tenant-1",
      assignmentId: "missing",
      scope: { kind: "tenant" },
    });

    expect(removed).toBe(false);
  });
});
