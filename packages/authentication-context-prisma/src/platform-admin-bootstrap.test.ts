import { describe, expect, it, vi } from "vitest";
import {
  bootstrapPlatformAdmin,
  PLATFORM_OWNER_ROLE,
  PLATFORM_PERMISSION_CODES,
  type PlatformAdminBootstrapPrismaClient,
} from "./platform-admin-bootstrap";

function createMockPrisma(): PlatformAdminBootstrapPrismaClient {
  const permissionDb = new Map<string, { id: string; code: string }>();
  const roleDb = new Map<string, { id: string; code: string; name: string; isActive: boolean; permissions: Array<{ permission: { code: string } }> }>();
  const rolePermissionDb = new Set<string>();
  const userDb = new Map<string, { id: string; email: string; isActive: boolean }>();
  const userRoleDb = new Set<string>();

  const tx = {
    permission: {
      findUnique: async ({ where }: { where: { code: string } }) => permissionDb.get(where.code) ?? null,
      create: async ({ data }: { data: { code: string } }) => {
        const record = { id: `perm-${data.code}`, code: data.code };
        permissionDb.set(data.code, record);
        return record;
      },
    },
    platformRole: {
      findUnique: async ({ where }: { where: { code: string } }) => roleDb.get(where.code) ?? null,
      create: async ({ data }: { data: { code: string; name: string } }) => {
        const record = { id: `role-${data.code}`, code: data.code, name: data.name, isActive: true, permissions: [] as Array<{ permission: { code: string } }> };
        roleDb.set(data.code, record);
        return record;
      },
    },
    platformRolePermission: {
      create: async ({ data }: { data: { roleId: string; permissionId: string } }) => {
        rolePermissionDb.add(`${data.roleId}:${data.permissionId}`);
        // Update the role's permissions array for subsequent findUnique calls
        for (const role of roleDb.values()) {
          if (role.id === data.roleId) {
            const perm = Array.from(permissionDb.values()).find(p => p.id === data.permissionId);
            if (perm && !role.permissions.some(rp => rp.permission.code === perm.code)) {
              role.permissions.push({ permission: { code: perm.code } });
            }
          }
        }
        return {};
      },
    },
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => userDb.get(where.email) ?? null,
    },
    platformUserRole: {
      findFirst: async ({ where }: { where: { userId: string; roleId: string } }) => userRoleDb.has(`${where.userId}:${where.roleId}`) ? { id: "existing" } : null,
      create: async ({ data }: { data: { userId: string; roleId: string } }) => {
        userRoleDb.add(`${data.userId}:${data.roleId}`);
        return {};
      },
    },
  };

  return {
    $transaction: async (callback) => {
      return callback(tx as never);
    },
  } as never;
}

describe("platform admin bootstrap", () => {
  it("creates platform.manage permission and platform-owner role", async () => {
    const prisma = createMockPrisma();
    const result = await bootstrapPlatformAdmin(prisma, {
      ownerEmail: "admin@test.com",
    });

    expect(result.roleCode).toBe("platform-owner");
    expect(result.permissionCodes).toEqual(["platform.manage"]);
    expect(result.permissionsCreated).toBe(1);
    expect(result.rolePermissionsCreated).toBe(1);
    expect(result.userId).toBeNull();
    expect(result.userRoleCreated).toBe(false);
  });

  it("is idempotent — does not create duplicates on second run", async () => {
    const prisma = createMockPrisma();
    await bootstrapPlatformAdmin(prisma, { ownerEmail: "admin@test.com" });
    const result = await bootstrapPlatformAdmin(prisma, { ownerEmail: "admin@test.com" });

    expect(result.permissionsCreated).toBe(0);
    expect(result.rolePermissionsCreated).toBe(0);
  });

  it("assigns platform-owner role to existing user", async () => {
    const prisma = createMockPrisma();
    // Pre-create user in the mock
    const innerPrisma = {
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback({
          permission: {
            findUnique: async () => null,
            create: async ({ data }: { data: { code: string } }) => ({ id: `perm-${data.code}`, code: data.code }),
          },
          platformRole: {
            findUnique: async () => null,
            create: async ({ data }: { data: { code: string; name: string } }) => ({
              id: `role-${data.code}`, code: data.code, name: data.name, isActive: true, permissions: [],
            }),
          },
          platformRolePermission: { create: async () => ({}) },
          user: {
            findUnique: async () => ({ id: "user-1", email: "admin@test.com", isActive: true }),
          },
          platformUserRole: {
            findFirst: async () => null,
            create: async () => ({}),
          },
        });
      },
    } as unknown as PlatformAdminBootstrapPrismaClient;

    const result = await bootstrapPlatformAdmin(innerPrisma, {
      ownerEmail: "admin@test.com",
    });

    expect(result.userId).toBe("user-1");
    expect(result.userRoleCreated).toBe(true);
  });

  it("does not assign role to inactive user", async () => {
    const innerPrisma = {
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback({
          permission: {
            findUnique: async () => ({ id: "perm-1", code: "platform.manage" }),
            create: async () => ({ id: "perm-1", code: "platform.manage" }),
          },
          platformRole: {
            findUnique: async () => ({
              id: "role-1", code: "platform-owner", name: "Platform Owner", isActive: true,
              permissions: [{ permission: { code: "platform.manage" } }],
            }),
            create: async () => ({ id: "role-1", code: "platform-owner", name: "Platform Owner" }),
          },
          platformRolePermission: { create: async () => ({}) },
          user: {
            findUnique: async () => ({ id: "user-1", email: "admin@test.com", isActive: false }),
          },
          platformUserRole: {
            findFirst: async () => null,
            create: async () => ({}),
          },
        });
      },
    } as unknown as PlatformAdminBootstrapPrismaClient;

    const result = await bootstrapPlatformAdmin(innerPrisma, {
      ownerEmail: "admin@test.com",
    });

    expect(result.userId).toBeNull();
    expect(result.userRoleCreated).toBe(false);
  });
});
