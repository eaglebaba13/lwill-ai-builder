import { describe, expect, it, vi } from "vitest";
import {
  bootstrapSettingPermissions,
  formatSettingPermissionsBootstrapError,
  formatSettingPermissionsBootstrapResult,
  SettingPermissionsBootstrapError,
  type SettingPermissionsBootstrapPrismaClient,
} from "./initial-setting-permissions-bootstrap";

function createFixture(overrides: {
  missingTenant?: boolean;
  ambiguousTenant?: boolean;
  inactiveTenant?: boolean;
  missingRole?: boolean;
  ambiguousRole?: boolean;
  conflictingRole?: boolean;
  preexistingPermissions?: boolean;
} = {}) {
  const state = {
    tenantId: "tenant-1",
    roleId: "role-1",
    permissions: new Map<string, string>(),
    rolePermissions: new Set<string>(),
  };

  const transaction: SettingPermissionsBootstrapPrismaClient = {
    $transaction: vi.fn(async (callback) => {
      return callback({
        tenant: {
          findMany: vi.fn(async () => {
            if (overrides.missingTenant) return [];
            if (overrides.ambiguousTenant) {
              return [
                { id: "tenant-1", name: "HDK Beauty I Pvt. Ltd.", slug: "hdk-beauty-i-pvt-ltd", isActive: true },
                { id: "tenant-2", name: "HDK Beauty I Pvt. Ltd.", slug: "hdk-beauty-i-pvt-ltd-2", isActive: true },
              ];
            }
            return [
              {
                id: "tenant-1",
                name: "HDK Beauty I Pvt. Ltd.",
                slug: "hdk-beauty-i-pvt-ltd",
                isActive: overrides.inactiveTenant ? false : true,
              },
            ];
          }),
        },
        role: {
          findMany: vi.fn(async () => {
            if (overrides.missingRole) return [];
            if (overrides.ambiguousRole) {
              return [
                { id: "role-1", code: "tenant-admin", name: "Tenant Admin", isActive: true, permissions: [] },
                { id: "role-2", code: "tenant-admin", name: "Tenant Admin", isActive: true, permissions: [] },
              ];
            }
            if (overrides.conflictingRole) {
              return [
                { id: "role-1", code: "tenant-admin", name: "Tenant Admin", isActive: false, permissions: [] },
              ];
            }
            return [
              {
                id: "role-1",
                code: "tenant-admin",
                name: "Tenant Admin",
                isActive: true,
                permissions: overrides.preexistingPermissions
                  ? [{ permission: { code: "setting.read" } }, { permission: { code: "setting.write" } }]
                  : [],
              },
            ];
          }),
        },
        permission: {
          findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
            if (state.permissions.has(where.code)) {
              return { id: state.permissions.get(where.code)!, code: where.code };
            }
            return null;
          }),
          create: vi.fn(async ({ data }: { data: { code: string } }) => {
            const id = `perm-${data.code}`;
            state.permissions.set(data.code, id);
            return { id, code: data.code };
          }),
        },
        rolePermission: {
          create: vi.fn(async ({ data }: { data: { tenantId: string; roleId: string; permissionId: string } }) => {
            state.rolePermissions.add(`${data.tenantId}:${data.roleId}:${data.permissionId}`);
          }),
        },
      } as never);
    }),
  };

  return { transaction, state };
}

describe("setting permissions bootstrap", () => {
  it("creates setting.read and setting.write permissions and assigns them to tenant-admin", async () => {
    const { transaction, state } = createFixture();

    const result = await bootstrapSettingPermissions(transaction);

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["setting.read", "setting.write"],
      permissionsCreated: 2,
      rolePermissionsCreated: 2,
    });
    expect(state.permissions.get("setting.read")).toBe("perm-setting.read");
    expect(state.permissions.get("setting.write")).toBe("perm-setting.write");
  });

  it("is idempotent when permissions and role permissions already exist", async () => {
    const { transaction, state } = createFixture({ preexistingPermissions: true });
    state.permissions.set("setting.read", "perm-setting.read");
    state.permissions.set("setting.write", "perm-setting.write");

    const result = await bootstrapSettingPermissions(transaction);

    expect(result).toMatchObject({
      permissionsCreated: 0,
      rolePermissionsCreated: 0,
    });
    expect(state.rolePermissions.size).toBe(0);
  });

  it("fails closed when the target tenant is missing", async () => {
    const { transaction } = createFixture({ missingTenant: true });
    await expect(bootstrapSettingPermissions(transaction)).rejects.toThrow(
      "Target tenant not found; run the initial hierarchy bootstrap first",
    );
  });

  it("fails closed when the target tenant is inactive", async () => {
    const { transaction } = createFixture({ inactiveTenant: true });
    await expect(bootstrapSettingPermissions(transaction)).rejects.toThrow(
      "Target tenant is inactive",
    );
  });

  it("fails closed when the target role is missing", async () => {
    const { transaction } = createFixture({ missingRole: true });
    await expect(bootstrapSettingPermissions(transaction)).rejects.toThrow(
      "Target role not found; run the initial hierarchy bootstrap first",
    );
  });

  it("fails closed when the target role is conflicting", async () => {
    const { transaction } = createFixture({ conflictingRole: true });
    await expect(bootstrapSettingPermissions(transaction)).rejects.toThrow(
      "Conflicting target role record",
    );
  });

  it("fails closed on ambiguous tenant records", async () => {
    const { transaction } = createFixture({ ambiguousTenant: true });
    await expect(bootstrapSettingPermissions(transaction)).rejects.toThrow(
      "Ambiguous target tenant records",
    );
  });

  it("fails closed on ambiguous role records", async () => {
    const { transaction } = createFixture({ ambiguousRole: true });
    await expect(bootstrapSettingPermissions(transaction)).rejects.toThrow(
      "Ambiguous target role records",
    );
  });

  it("does not return or log sensitive data", () => {
    const result = formatSettingPermissionsBootstrapResult({
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["setting.read", "setting.write"],
      permissionsCreated: 2,
      rolePermissionsCreated: 2,
    });

    expect(result).not.toContain("password");
    expect(result).not.toContain("secret");
    expect(formatSettingPermissionsBootstrapError(new Error("secret"))).toBe(
      "Setting permissions bootstrap failed",
    );
  });
});
