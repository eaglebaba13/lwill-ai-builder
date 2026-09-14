import { describe, expect, it, vi } from "vitest";
import { createMembershipRoleService } from "./membership-role-service";

function createFixture() {
  type MembershipState = { id: string; tenantId: string; userId: string };
  type RoleState = { id: string; tenantId: string; code?: string };
  type BusinessUnitState = { id: string; tenantId: string };
  type BranchState = { id: string; tenantId: string };
  type TerritoryState = { id: string; tenantId: string };
  const state = {
    memberships: new Map<string, MembershipState>(),
    roles: new Map<string, RoleState>(),
    businessUnits: new Map<string, BusinessUnitState>(),
    branches: new Map<string, BranchState>(),
    territories: new Map<string, TerritoryState>(),
    tenantRoles: new Map<string, { id: string }>(),
    buRoles: new Map<string, { id: string }>(),
    branchRoles: new Map<string, { id: string }>(),
    territoryRoles: new Map<string, { id: string }>(),
  };
  const prisma = {
    tenantMembership: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; id: string } }) =>
        [...state.memberships.values()].find((m) => m.tenantId === where.tenantId && m.id === where.id) ?? null,
      ),
    },
    role: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; id: string } }) => {
        const role = [...state.roles.values()].find((r) => r.tenantId === where.tenantId && r.id === where.id) ?? null;
        if (role === null) return null;
        return { id: role.id, code: role.code ?? "unknown" };
      }),
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
    territory: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; id: string; isActive: true } }) =>
        [...state.territories.values()].find((t) => t.tenantId === where.tenantId && t.id === where.id) ?? null,
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
    territoryMembershipRole: {
      create: vi.fn(async ({ data }: { data: { tenantId: string; membershipId: string; roleId: string; territoryId: string } }) => {
        const id = `tr-${Math.random()}`;
        state.territoryRoles.set(id, { id });
        return { id };
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; tenantId: string } }) =>
        [...state.territoryRoles.entries()].find(([, v]) => v.id === where.id) ?.[1] ?? null,
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        state.territoryRoles.delete(where.id);
        return { id: where.id };
      }),
    },
    auditLog: {
      create: vi.fn(async () => ({})),
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

describe("membership-role service: scope-kind enforcement", () => {
  it("branch-manager + tenant scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-bm", { id: "r-bm", tenantId: "t1", code: "branch-manager" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-bm",
      scope: { kind: "tenant" },
    })).rejects.toThrow("Role \"branch-manager\" requires BRANCH scope, but tenant scope was provided");
  });

  it("branch-manager + business-unit scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-bm", { id: "r-bm", tenantId: "t1", code: "branch-manager" });
    state.businessUnits.set("bu-1", { id: "bu-1", tenantId: "t1" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-bm",
      scope: { kind: "business-unit", businessUnitId: "bu-1" },
    })).rejects.toThrow("Role \"branch-manager\" requires BRANCH scope, but business-unit scope was provided");
  });

  it("branch-manager + branch scope → accepted", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-bm", { id: "r-bm", tenantId: "t1", code: "branch-manager" });
    state.businessUnits.set("bu-1", { id: "bu-1", tenantId: "t1" });
    state.branches.set("b-1", { id: "b-1", tenantId: "t1" });
    const service = createMembershipRoleService(prisma as never);

    const assignment = await service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-bm",
      scope: { kind: "branch", businessUnitId: "bu-1", branchId: "b-1" },
    });

    expect(assignment.scope.kind).toBe("branch");
  });

  it("receptionist + tenant scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-rec", { id: "r-rec", tenantId: "t1", code: "receptionist" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-rec",
      scope: { kind: "tenant" },
    })).rejects.toThrow("requires BRANCH scope");
  });

  it("nail-technician + tenant scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-nt", { id: "r-nt", tenantId: "t1", code: "nail-technician" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-nt",
      scope: { kind: "tenant" },
    })).rejects.toThrow("requires BRANCH scope");
  });

  it("state-franchise + tenant scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-sf", { id: "r-sf", tenantId: "t1", code: "state-franchise" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-sf",
      scope: { kind: "tenant" },
    })).rejects.toThrow("requires TERRITORY scope");
  });

  it("state-franchise + territory scope → accepted", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-sf", { id: "r-sf", tenantId: "t1", code: "state-franchise" });
    state.territories.set("terr-1", { id: "terr-1", tenantId: "t1" });
    const service = createMembershipRoleService(prisma as never);

    const assignment = await service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-sf",
      scope: { kind: "territory", territoryId: "terr-1" },
    });

    expect(assignment.scope.kind).toBe("territory");
    expect((assignment.scope as { kind: "territory"; territoryId: string }).territoryId).toBe("terr-1");
  });

  it("master-franchise + tenant scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-mf", { id: "r-mf", tenantId: "t1", code: "master-franchise" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-mf",
      scope: { kind: "tenant" },
    })).rejects.toThrow("requires TERRITORY scope");
  });

  it("master-franchise + territory scope → accepted", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-mf", { id: "r-mf", tenantId: "t1", code: "master-franchise" });
    state.territories.set("terr-1", { id: "terr-1", tenantId: "t1" });
    const service = createMembershipRoleService(prisma as never);

    const assignment = await service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-mf",
      scope: { kind: "territory", territoryId: "terr-1" },
    });

    expect(assignment.scope.kind).toBe("territory");
  });

  it("city-franchise + branch scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-cf", { id: "r-cf", tenantId: "t1", code: "city-franchise" });
    state.businessUnits.set("bu-1", { id: "bu-1", tenantId: "t1" });
    state.branches.set("b-1", { id: "b-1", tenantId: "t1" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-cf",
      scope: { kind: "branch", businessUnitId: "bu-1", branchId: "b-1" },
    })).rejects.toThrow("requires BUSINESS_UNIT scope");
  });

  it("city-franchise + business-unit scope → accepted", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-cf", { id: "r-cf", tenantId: "t1", code: "city-franchise" });
    state.businessUnits.set("bu-1", { id: "bu-1", tenantId: "t1" });
    const service = createMembershipRoleService(prisma as never);

    const assignment = await service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-cf",
      scope: { kind: "business-unit", businessUnitId: "bu-1" },
    });

    expect(assignment.scope.kind).toBe("business-unit");
  });

  it("cross-tenant territory target → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-sf", { id: "r-sf", tenantId: "t1", code: "state-franchise" });
    state.territories.set("terr-other", { id: "terr-other", tenantId: "t2" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-sf",
      scope: { kind: "territory", territoryId: "terr-other" },
    })).rejects.toThrow("Territory not found in tenant");
  });

  it("admin role with non-tenant scope → rejected", async () => {
    const { prisma, state } = createFixture();
    state.memberships.set("m-1", { id: "m-1", tenantId: "t1", userId: "u1" });
    state.roles.set("r-adm", { id: "r-adm", tenantId: "t1", code: "admin" });
    state.businessUnits.set("bu-1", { id: "bu-1", tenantId: "t1" });
    const service = createMembershipRoleService(prisma as never);

    await expect(service.assignRole({
      tenantId: "t1", membershipId: "m-1", roleId: "r-adm",
      scope: { kind: "business-unit", businessUnitId: "bu-1" },
    })).rejects.toThrow("does not require a scope; only tenant scope is allowed");
  });
});
