import { describe, expect, it, vi } from "vitest";
import {
  bootstrapAiProjectPermissions,
  formatAiProjectPermissionsBootstrapError,
  formatAiProjectPermissionsBootstrapResult,
  AiProjectPermissionsBootstrapError,
  type AiProjectPermissionsBootstrapPrismaClient,
} from "./initial-ai-project-permissions-bootstrap";

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

  const transaction: AiProjectPermissionsBootstrapPrismaClient = {
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
                  ? [{ permission: { code: "ai.project.read" } }, { permission: { code: "ai.project.write" } }]
                  : [],
              },
            ];
          }),
        },
        permission: {
          findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
            const id = state.permissions.get(where.code);
            return id ? { id, code: where.code } : null;
          }),
          create: vi.fn(async ({ data }: { data: { code: string } }) => {
            const id = `perm-${data.code}`;
            state.permissions.set(data.code, id);
            return { id, code: data.code };
          }),
        },
        rolePermission: {
          create: vi.fn(async ({ data }: { data: { tenantId: string; roleId: string; permissionId: string } }) => {
            state.rolePermissions.add(`${data.roleId}:${data.permissionId}`);
            return {};
          }),
        },
      } as never);
    }),
  };

  return { transaction, state };
}

describe("bootstrapAiProjectPermissions", () => {
  it("creates ai.project.read and ai.project.write permissions and assigns them to tenant-admin", async () => {
    const { transaction, state } = createFixture();

    const result = await bootstrapAiProjectPermissions(transaction);

    expect(result).toEqual({
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["ai.project.read", "ai.project.write"],
      permissionsCreated: 2,
      rolePermissionsCreated: 2,
    });
    expect(state.permissions.get("ai.project.read")).toBe("perm-ai.project.read");
    expect(state.permissions.get("ai.project.write")).toBe("perm-ai.project.write");
    expect(state.rolePermissions.has("role-1:perm-ai.project.read")).toBe(true);
    expect(state.rolePermissions.has("role-1:perm-ai.project.write")).toBe(true);
  });

  it("is idempotent when permissions and assignments already exist", async () => {
    const { transaction, state } = createFixture({ preexistingPermissions: true });
    state.permissions.set("ai.project.read", "perm-ai.project.read");
    state.permissions.set("ai.project.write", "perm-ai.project.write");

    const result = await bootstrapAiProjectPermissions(transaction);

    expect(result).toEqual({
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["ai.project.read", "ai.project.write"],
      permissionsCreated: 0,
      rolePermissionsCreated: 0,
    });
  });

  it("fails closed when target tenant is missing", async () => {
    const { transaction } = createFixture({ missingTenant: true });
    await expect(bootstrapAiProjectPermissions(transaction)).rejects.toThrow(
      AiProjectPermissionsBootstrapError,
    );
  });

  it("fails closed when target tenant is ambiguous", async () => {
    const { transaction } = createFixture({ ambiguousTenant: true });
    await expect(bootstrapAiProjectPermissions(transaction)).rejects.toThrow(
      "Ambiguous target tenant records",
    );
  });

  it("fails closed when target tenant is inactive", async () => {
    const { transaction } = createFixture({ inactiveTenant: true });
    await expect(bootstrapAiProjectPermissions(transaction)).rejects.toThrow(
      "Target tenant is inactive",
    );
  });

  it("fails closed when target role is missing", async () => {
    const { transaction } = createFixture({ missingRole: true });
    await expect(bootstrapAiProjectPermissions(transaction)).rejects.toThrow(
      "Target role not found; run the initial hierarchy bootstrap first",
    );
  });

  it("fails closed when target role is ambiguous", async () => {
    const { transaction } = createFixture({ ambiguousRole: true });
    await expect(bootstrapAiProjectPermissions(transaction)).rejects.toThrow(
      "Ambiguous target role records",
    );
  });

  it("fails closed when target role is conflicting", async () => {
    const { transaction } = createFixture({ conflictingRole: true });
    await expect(bootstrapAiProjectPermissions(transaction)).rejects.toThrow(
      "Conflicting target role record",
    );
  });

  it("formats completed result and error messages", () => {
    const resultString = formatAiProjectPermissionsBootstrapResult({
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["ai.project.read", "ai.project.write"],
      permissionsCreated: 2,
      rolePermissionsCreated: 2,
    });
    expect(JSON.parse(resultString)).toEqual({
      status: "completed",
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["ai.project.read", "ai.project.write"],
      permissionsCreated: 2,
      rolePermissionsCreated: 2,
    });

    const knownError = formatAiProjectPermissionsBootstrapError(
      new AiProjectPermissionsBootstrapError("Test error"),
    );
    expect(knownError).toBe("Test error");

    const unknownError = formatAiProjectPermissionsBootstrapError(new Error("Unknown"));
    expect(unknownError).toBe("AI project permissions bootstrap failed");
  });
});
