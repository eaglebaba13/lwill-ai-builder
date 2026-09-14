import { describe, expect, it, vi } from "vitest";
import { bootstrapSettlementPermissions, SETTLEMENT_PERMISSION_CODES } from "./initial-settlement-permissions-bootstrap";

function createPrisma() {
  const state = {
    permissions: [] as Array<{ id: string; code: string }>,
    rolePermissions: [] as Array<{ id: string; tenantId: string; roleId: string; permissionId: string }>,
  };
  let permIdCounter = 0;
  let rpIdCounter = 0;

  const prisma = {
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = {
        tenant: {
          findMany: vi.fn(async () => [{ id: "tenant-1", name: "HDK Beauty I Pvt. Ltd.", slug: "hdk", isActive: true }]),
        },
        role: {
          findMany: vi.fn(async () => [{
            id: "role-1",
            code: "tenant-admin",
            name: "Tenant Admin",
            isActive: true,
            permissions: [
              { permission: { code: "tenant.manage" } },
              ...state.rolePermissions.map((rp) => ({ permission: { code: state.permissions.find((p) => p.id === rp.permissionId)?.code ?? "" } })),
            ],
          }]),
        },
        permission: {
          findUnique: vi.fn(async ({ where }: { where: { code: string } }) => state.permissions.find((p) => p.code === where.code) ?? null),
          create: vi.fn(async ({ data }: { data: { code: string } }) => {
            const perm = { id: `perm-${++permIdCounter}`, code: data.code };
            state.permissions.push(perm);
            return perm;
          }),
        },
        rolePermission: {
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

describe("settlement-permissions-bootstrap", () => {
  it("creates settlement permissions and assigns to tenant-admin", async () => {
    const { prisma, state } = createPrisma();
    const result = await bootstrapSettlementPermissions(prisma);

    expect(result.tenantId).toBe("tenant-1");
    expect(result.roleId).toBe("role-1");
    expect(result.permissionsCreated).toBe(3);
    expect(result.rolePermissionsCreated).toBe(3);
    expect(state.rolePermissions).toHaveLength(3);
    const assignedCodes = state.rolePermissions.map((rp) => state.permissions.find((p) => p.id === rp.permissionId)?.code).sort();
    expect(assignedCodes).toEqual(["settlement.approve", "settlement.generate", "settlement.view"]);
  });

  it("is idempotent", async () => {
    const { prisma, state } = createPrisma();
    await bootstrapSettlementPermissions(prisma);
    const result2 = await bootstrapSettlementPermissions(prisma);

    expect(result2.permissionsCreated).toBe(0);
    expect(result2.rolePermissionsCreated).toBe(0);
    expect(state.rolePermissions).toHaveLength(3);
  });

  it("throws for missing tenant", async () => {
    const { prisma } = createPrisma();
    prisma.$transaction = async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = { tenant: { findMany: vi.fn(async () => []) } };
      return callback(tx);
    };
    await expect(bootstrapSettlementPermissions(prisma)).rejects.toThrow("Target tenant not found");
  });

  it("throws for missing role", async () => {
    const { prisma } = createPrisma();
    prisma.$transaction = async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = {
        tenant: { findMany: vi.fn(async () => [{ id: "t1", name: "HDK Beauty I Pvt. Ltd.", slug: "hdk", isActive: true }]) },
        role: { findMany: vi.fn(async () => []) },
      };
      return callback(tx);
    };
    await expect(bootstrapSettlementPermissions(prisma)).rejects.toThrow("Target role not found");
  });
});
