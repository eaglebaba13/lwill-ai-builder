import { describe, expect, it, vi } from "vitest";
import {
  bootstrapStockTransferPermissions,
  type StockTransferPermissionsBootstrapPrismaClient,
} from "./initial-stock-transfer-permissions-bootstrap";

function createFixture(overrides: {
  tenantMatches?: Array<Record<string, unknown>>;
  roleMatches?: Array<Record<string, unknown>>;
} = {}) {
  const state = {
    permissions: new Map<string, { id: string; code: string }>(),
    rolePermissionsCreated: 0,
  };

  const tenant = overrides.tenantMatches?.[0] ?? {
    id: "tenant-1",
    name: "HDK Beauty I Pvt. Ltd.",
    slug: "hdk-beauty-i-pvt-ltd",
    isActive: true,
  };

  const role = overrides.roleMatches?.[0] ?? {
    id: "role-1",
    code: "tenant-admin",
    name: "Tenant Admin",
    isActive: true,
    permissions: [] as Array<{ permission: { code: string } }>,
  };

  let permissionIdCounter = 0;
  const transaction = {
    tenant: {
      findMany: vi.fn(async () =>
        overrides.tenantMatches !== undefined ? overrides.tenantMatches : [tenant],
      ),
    },
    role: {
      findMany: vi.fn(async () =>
        overrides.roleMatches !== undefined ? overrides.roleMatches : [role],
      ),
    },
    permission: {
      findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
        return state.permissions.get(where.code) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { code: string } }) => {
        const record = { id: `perm-${++permissionIdCounter}`, code: data.code };
        state.permissions.set(data.code, record);
        return record;
      }),
    },
    rolePermission: {
      create: vi.fn(async () => {
        state.rolePermissionsCreated += 1;
      }),
    },
  };
  const prisma: StockTransferPermissionsBootstrapPrismaClient = {
    $transaction: vi.fn(async (callback) => callback(transaction as never)),
  };
  return { prisma, state, transaction };
}

describe("stock transfer permissions bootstrap", () => {
  it("creates stockTransfer.read and stockTransfer.write permissions and assigns them to tenant-admin", async () => {
    const fixture = createFixture();

    const result = await bootstrapStockTransferPermissions(fixture.prisma);

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["stockTransfer.read", "stockTransfer.write"],
      permissionsCreated: 2,
      rolePermissionsCreated: 2,
    });
    expect(fixture.transaction.permission.create).toHaveBeenCalledTimes(2);
    expect(fixture.transaction.rolePermission.create).toHaveBeenCalledTimes(2);
  });

  it("is idempotent when permissions and role permissions already exist", async () => {
    const fixture = createFixture({
      roleMatches: [{
        id: "role-1",
        code: "tenant-admin",
        name: "Tenant Admin",
        isActive: true,
        permissions: [
          { permission: { code: "stockTransfer.read" } },
          { permission: { code: "stockTransfer.write" } },
        ],
      }],
    });
    fixture.state.permissions.set("stockTransfer.read", { id: "perm-1", code: "stockTransfer.read" });
    fixture.state.permissions.set("stockTransfer.write", { id: "perm-2", code: "stockTransfer.write" });

    const result = await bootstrapStockTransferPermissions(fixture.prisma);
    expect(result).toMatchObject({
      permissionsCreated: 0,
      rolePermissionsCreated: 0,
    });
    expect(fixture.transaction.permission.create).not.toHaveBeenCalled();
    expect(fixture.transaction.rolePermission.create).not.toHaveBeenCalled();
  });

  it("fails when the target tenant is missing", async () => {
    const fixture = createFixture({ tenantMatches: [] });

    await expect(bootstrapStockTransferPermissions(fixture.prisma)).rejects.toThrow(
      "Target tenant not found; run the initial hierarchy bootstrap first",
    );
  });

  it("fails when the target role is missing", async () => {
    const fixture = createFixture({ roleMatches: [] });

    await expect(bootstrapStockTransferPermissions(fixture.prisma)).rejects.toThrow(
      "Target role not found; run the initial hierarchy bootstrap first",
    );
  });
});
