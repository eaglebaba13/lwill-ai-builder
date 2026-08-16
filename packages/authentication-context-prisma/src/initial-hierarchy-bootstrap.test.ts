import { describe, expect, it, vi } from "vitest";
import {
  bootstrapInitialHierarchy,
  type InitialHierarchyBootstrapPrismaClient,
} from "./initial-hierarchy-bootstrap";

function createFixture(overrides: {
  tenantMatches?: Array<Record<string, unknown>>;
  businessUnitMatches?: Array<Record<string, unknown>>;
  roleMatches?: Array<Record<string, unknown>>;
  rolePermissions?: string[];
  roleInactive?: boolean;
} = {}) {
  const state = {
    tenant: null as Record<string, unknown> | null,
    businessUnit: null as Record<string, unknown> | null,
    role: null as Record<string, unknown> | null,
    permission: null as { id: string; code: string } | null,
    rolePermissionCreated: false,
  };

  if (overrides.rolePermissions !== undefined || overrides.roleInactive) {
    state.role = {
      id: "role-1",
      code: "tenant-admin",
      name: "Tenant Admin",
      isActive: !overrides.roleInactive,
      permissions: (overrides.rolePermissions ?? []).map((code) => ({
        permission: { code },
      })),
    };
  }

  const transaction = {
    tenant: {
      findMany: vi.fn(async () => overrides.tenantMatches ?? (state.tenant ? [state.tenant] : [])),
      create: vi.fn(async ({ data }) => {
        state.tenant = { id: "tenant-1", ...data };
        return state.tenant;
      }),
    },
    businessUnit: {
      findMany: vi.fn(async () => overrides.businessUnitMatches
        ?? (state.businessUnit ? [state.businessUnit] : [])),
      create: vi.fn(async ({ data }) => {
        state.businessUnit = { id: "business-unit-1", ...data };
        return state.businessUnit;
      }),
    },
    role: {
      findMany: vi.fn(async () => overrides.roleMatches ?? (state.role ? [state.role] : [])),
      create: vi.fn(async ({ data }) => {
        state.role = { id: "role-1", ...data, permissions: [] };
        return state.role;
      }),
    },
    permission: {
      findUnique: vi.fn(async () => state.permission),
      create: vi.fn(async ({ data }) => {
        state.permission = { id: "permission-1", ...data };
        return state.permission;
      }),
    },
    rolePermission: {
      create: vi.fn(async () => {
        state.rolePermissionCreated = true;
        if (state.role !== null) {
          state.role.permissions = [{ permission: { code: "tenant.manage" } }];
        }
      }),
    },
  };
  const prisma: InitialHierarchyBootstrapPrismaClient = {
    $transaction: vi.fn(async (callback) => callback(transaction as never)),
  };
  return { prisma, state, transaction };
}

describe("initial hierarchy bootstrap", () => {
  it("creates the approved hierarchy, role, and existing permission set", async () => {
    const fixture = createFixture();

    const result = await bootstrapInitialHierarchy(fixture.prisma);

    expect(result).toMatchObject({
      permissionCodes: ["tenant.manage"],
      tenantCreated: true,
      businessUnitCreated: true,
      roleCreated: true,
      permissionsCreated: 1,
      rolePermissionsCreated: 1,
    });
    expect(fixture.transaction.tenant.create).toHaveBeenCalledWith({
      data: {
        name: "HDK Beauty I Pvt. Ltd.",
        slug: "hdk-beauty-i-pvt-ltd",
        isActive: true,
      },
    });
    expect(fixture.transaction.businessUnit.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.role.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.rolePermission.create).toHaveBeenCalledOnce();
  });

  it("is idempotent after the approved records exist", async () => {
    const fixture = createFixture();
    await bootstrapInitialHierarchy(fixture.prisma);

    const result = await bootstrapInitialHierarchy(fixture.prisma);

    expect(result).toMatchObject({
      tenantCreated: false,
      businessUnitCreated: false,
      roleCreated: false,
      permissionsCreated: 0,
      rolePermissionsCreated: 0,
    });
    expect(fixture.transaction.tenant.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.businessUnit.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.role.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.permission.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.rolePermission.create).toHaveBeenCalledOnce();
  });

  it("fails closed on ambiguous or conflicting tenant records", async () => {
    const approvedTenant = {
      id: "tenant-1",
      name: "HDK Beauty I Pvt. Ltd.",
      slug: "hdk-beauty-i-pvt-ltd",
      isActive: true,
    };
    await expect(bootstrapInitialHierarchy(createFixture({
      tenantMatches: [approvedTenant, { ...approvedTenant, id: "tenant-2" }],
    }).prisma)).rejects.toThrow("Ambiguous initial tenant records");
    await expect(bootstrapInitialHierarchy(createFixture({
      tenantMatches: [{ ...approvedTenant, slug: "conflicting-slug" }],
    }).prisma)).rejects.toThrow("Conflicting initial tenant record");
  });

  it("fails closed on ambiguous business-unit records", async () => {
    const approvedBusinessUnit = {
      id: "business-unit-1",
      name: "X Nail Bar",
      slug: "x-nail-bar",
      isActive: true,
    };
    await expect(bootstrapInitialHierarchy(createFixture({
      businessUnitMatches: [
        approvedBusinessUnit,
        { ...approvedBusinessUnit, id: "business-unit-2" },
      ],
    }).prisma)).rejects.toThrow("Ambiguous initial business unit records");
  });

  it("fails closed on ambiguous tenant administrator roles", async () => {
    const approvedRole = {
      id: "role-1",
      code: "tenant-admin",
      name: "Tenant Admin",
      isActive: true,
      permissions: [],
    };
    await expect(bootstrapInitialHierarchy(createFixture({
      roleMatches: [approvedRole, { ...approvedRole, id: "role-2" }],
    }).prisma)).rejects.toThrow("Ambiguous initial tenant administrator roles");
  });

  it("fails closed on inactive roles or unapproved permissions", async () => {
    await expect(bootstrapInitialHierarchy(createFixture({
      roleInactive: true,
    }).prisma)).rejects.toThrow("Conflicting initial tenant administrator role");
    await expect(bootstrapInitialHierarchy(createFixture({
      rolePermissions: ["customer.write"],
    }).prisma)).rejects.toThrow(
      "Initial tenant administrator role has unapproved permission: customer.write",
    );
  });
});