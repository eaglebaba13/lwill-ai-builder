import { describe, expect, it, vi } from "vitest";
import { bootstrapXnailRoles, X_NAIL_ROLE_CATALOGUE, getRoleScopeMetadata, SCOPE_TYPES } from "./xnail-role-bootstrap";

function createPrisma() {
  const state = {
    tenants: [{ id: "tenant-1" }],
    roles: [] as Array<{ id: string; code: string; tenantId: string; name: string; description: string; isSystem: boolean; isActive: boolean }>,
    permissions: [] as Array<{ id: string; code: string; description: string }>,
    rolePermissions: [] as Array<{ id: string; tenantId: string; roleId: string; permissionId: string }>,
  };

  let roleIdCounter = 0;
  let permIdCounter = 0;
  let rpIdCounter = 0;

  const prisma = {
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = {
        tenant: {
          findMany: vi.fn(async () => state.tenants),
        },
        role: {
          findMany: vi.fn(async () => state.roles.map((r) => ({ id: r.id, code: r.code }))),
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            const role = { id: `role-${++roleIdCounter}`, tenantId: data.tenantId as string, code: data.code as string, name: data.name as string, description: data.description as string, isSystem: false, isActive: true };
            state.roles.push(role);
            return role;
          }),
        },
        permission: {
          findUnique: vi.fn(async ({ where }: { where: { code: string } }) => state.permissions.find((p) => p.code === where.code) ?? null),
          create: vi.fn(async ({ data }: { data: { code: string; description: string } }) => {
            const perm = { id: `perm-${++permIdCounter}`, code: data.code, description: data.description };
            state.permissions.push(perm);
            return perm;
          }),
        },
        rolePermission: {
          findFirst: vi.fn(async ({ where }: { where: { tenantId: string; roleId: string; permissionId: string } }) => state.rolePermissions.find((rp) => rp.tenantId === where.tenantId && rp.roleId === where.roleId && rp.permissionId === where.permissionId) ?? null),
          create: vi.fn(async ({ data }: { data: { tenantId: string; roleId: string; permissionId: string } }) => {
            const rp = { id: `rp-${++rpIdCounter}`, ...data };
            state.rolePermissions.push(rp);
            return rp;
          }),
        },
      };
      return callback(tx);
    },
  };

  return { prisma: prisma as never, state };
}

describe("xnail-role-bootstrap: bootstrapXnailRoles", () => {
  it("creates all 16 X Nail roles", async () => {
    const { prisma, state } = createPrisma();
    const result = await bootstrapXnailRoles(prisma);

    expect(result.rolesCreated).toBe(16);
    expect(state.roles).toHaveLength(16);
    expect(state.roles.map((r) => r.code).sort()).toEqual(
      X_NAIL_ROLE_CATALOGUE.map((r) => r.code).sort(),
    );
  });

  it("creates permissions and role-permission links", async () => {
    const { prisma, state } = createPrisma();
    const result = await bootstrapXnailRoles(prisma);

    expect(result.permissionsCreated).toBeGreaterThan(0);
    expect(result.rolePermissionsCreated).toBeGreaterThan(0);
    expect(state.rolePermissions.length).toBeGreaterThan(0);
  });

  it("is idempotent — running twice does not duplicate", async () => {
    const { prisma, state } = createPrisma();
    await bootstrapXnailRoles(prisma);
    const rolesBefore = state.roles.length;
    const rpsBefore = state.rolePermissions.length;

    const result2 = await bootstrapXnailRoles(prisma);
    expect(result2.rolesCreated).toBe(0);
    expect(result2.rolePermissionsCreated).toBe(0);
    expect(state.roles.length).toBe(rolesBefore);
    expect(state.rolePermissions.length).toBe(rpsBefore);
  });

  it("throws for non-existent tenant", async () => {
    const { prisma } = createPrisma();
    prisma.$transaction = async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = { tenant: { findMany: vi.fn(async () => []) } };
      return callback(tx);
    };
    await expect(bootstrapXnailRoles(prisma)).rejects.toThrow("Expected exactly one active tenant");
  });

  it("assigns correct permissions to admin role", async () => {
    const { prisma, state } = createPrisma();
    await bootstrapXnailRoles(prisma);

    const adminRole = state.roles.find((r) => r.code === "admin");
    expect(adminRole).toBeDefined();
    const adminRps = state.rolePermissions.filter((rp) => rp.roleId === adminRole!.id);
    const adminPermCodes = adminRps.map((rp) => state.permissions.find((p) => p.id === rp.permissionId)?.code).sort();

    expect(adminPermCodes).toContain("tenant.manage");
    expect(adminPermCodes).toContain("customer.read");
    expect(adminPermCodes).toContain("customer.write");
    expect(adminPermCodes).toContain("invoice.read");
    expect(adminPermCodes).toContain("franchise.read");
  });

  it("nail-technician gets only read permissions", async () => {
    const { prisma, state } = createPrisma();
    await bootstrapXnailRoles(prisma);

    const techRole = state.roles.find((r) => r.code === "nail-technician");
    expect(techRole).toBeDefined();
    const techRps = state.rolePermissions.filter((rp) => rp.roleId === techRole!.id);
    const techPermCodes = techRps.map((rp) => state.permissions.find((p) => p.id === rp.permissionId)?.code);

    expect(techPermCodes).toContain("appointment.read");
    expect(techPermCodes).toContain("customer.read");
    expect(techPermCodes).not.toContain("customer.write");
    expect(techPermCodes).not.toContain("tenant.manage");
  });

  it("preserves existing tenant-admin role", async () => {
    const { prisma, state } = createPrisma();
    state.roles.push({ id: "existing-admin", code: "tenant-admin", tenantId: "tenant-1", name: "Tenant Admin", description: "Legacy", isSystem: true, isActive: true });

    const result = await bootstrapXnailRoles(prisma);
    expect(result.rolesCreated).toBe(16);
    expect(state.roles.find((r) => r.code === "tenant-admin")).toBeDefined();
  });

  it("creates role with correct scope metadata", async () => {
    const { prisma, state } = createPrisma();
    await bootstrapXnailRoles(prisma);

    const branchManager = state.roles.find((r) => r.code === "branch-manager");
    expect(branchManager?.name).toBe("Branch Manager");

    const stateFranchise = state.roles.find((r) => r.code === "state-franchise");
    expect(stateFranchise?.name).toBe("State Franchise");

    const auditor = state.roles.find((r) => r.code === "auditor");
    expect(auditor?.name).toBe("Auditor");
  });
});

describe("xnail-role-bootstrap: scope metadata", () => {
  it("returns valid scopeType for all catalogue roles", () => {
    for (const role of X_NAIL_ROLE_CATALOGUE) {
      const meta = getRoleScopeMetadata(role.code);
      expect(meta).toBeDefined();
      expect(SCOPE_TYPES).toContain(meta!.scopeType);
      expect(typeof meta!.requiresScope).toBe("boolean");
    }
  });

  it("city-franchise requires BUSINESS_UNIT scope", () => {
    const meta = getRoleScopeMetadata("city-franchise");
    expect(meta).toBeDefined();
    expect(meta!.scopeType).toBe("BUSINESS_UNIT");
    expect(meta!.requiresScope).toBe(true);
  });

  it("state-franchise requires TERRITORY scope", () => {
    const meta = getRoleScopeMetadata("state-franchise");
    expect(meta).toBeDefined();
    expect(meta!.scopeType).toBe("TERRITORY");
    expect(meta!.requiresScope).toBe(true);
  });

  it("master-franchise requires TERRITORY scope", () => {
    const meta = getRoleScopeMetadata("master-franchise");
    expect(meta).toBeDefined();
    expect(meta!.scopeType).toBe("TERRITORY");
    expect(meta!.requiresScope).toBe(true);
  });

  it("branch-manager requires BRANCH scope", () => {
    const meta = getRoleScopeMetadata("branch-manager");
    expect(meta).toBeDefined();
    expect(meta!.scopeType).toBe("BRANCH");
    expect(meta!.requiresScope).toBe(true);
  });

  it("receptionist requires BRANCH scope", () => {
    const meta = getRoleScopeMetadata("receptionist");
    expect(meta).toBeDefined();
    expect(meta!.scopeType).toBe("BRANCH");
    expect(meta!.requiresScope).toBe(true);
  });

  it("nail-technician requires BRANCH scope", () => {
    const meta = getRoleScopeMetadata("nail-technician");
    expect(meta).toBeDefined();
    expect(meta!.scopeType).toBe("BRANCH");
    expect(meta!.requiresScope).toBe(true);
  });

  it("tenant-level roles do not require geographic scope", () => {
    const tenantRoles = ["admin", "owner", "accountant", "sales", "marketing", "hr", "inventory", "trainer", "customer", "auditor"];
    for (const code of tenantRoles) {
      const meta = getRoleScopeMetadata(code);
      expect(meta).toBeDefined();
      expect(meta!.scopeType).toBe("TENANT");
      expect(meta!.requiresScope).toBe(false);
    }
  });

  it("returns undefined for unknown role code", () => {
    const meta = getRoleScopeMetadata("unknown-role");
    expect(meta).toBeUndefined();
  });

  it("auditor has TENANT scope with no geographic requirement", () => {
    const meta = getRoleScopeMetadata("auditor");
    expect(meta).toBeDefined();
    expect(meta!.scopeType).toBe("TENANT");
    expect(meta!.requiresScope).toBe(false);
  });
});
