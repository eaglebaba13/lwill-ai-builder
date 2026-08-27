import { describe, expect, it, vi } from "vitest";
import {
  bootstrapAppointmentPermissions,
  type AppointmentPermissionsBootstrapPrismaClient,
} from "./initial-appointment-permissions-bootstrap";

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
  const prisma: AppointmentPermissionsBootstrapPrismaClient = {
    $transaction: vi.fn(async (callback) => callback(transaction as never)),
  };
  return { prisma, state, transaction };
}

describe("appointment permissions bootstrap", () => {
  it("creates appointment.read and appointment.write permissions and assigns them to tenant-admin", async () => {
    const fixture = createFixture();

    const result = await bootstrapAppointmentPermissions(fixture.prisma);

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      roleId: "role-1",
      permissionCodes: ["appointment.read", "appointment.write"],
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
          { permission: { code: "appointment.read" } },
          { permission: { code: "appointment.write" } },
        ],
      }],
    });
    fixture.state.permissions.set("appointment.read", { id: "perm-1", code: "appointment.read" });
    fixture.state.permissions.set("appointment.write", { id: "perm-2", code: "appointment.write" });

    const result = await bootstrapAppointmentPermissions(fixture.prisma);
    expect(result).toMatchObject({
      permissionsCreated: 0,
      rolePermissionsCreated: 0,
    });
    expect(fixture.transaction.permission.create).not.toHaveBeenCalled();
    expect(fixture.transaction.rolePermission.create).not.toHaveBeenCalled();
  });

  it("fails closed when the target tenant is missing", async () => {
    const fixture = createFixture({ tenantMatches: [] });
    await expect(bootstrapAppointmentPermissions(fixture.prisma)).rejects.toThrow(
      "Target tenant not found; run the initial hierarchy bootstrap first",
    );
  });

  it("fails closed when the target tenant is inactive", async () => {
    const fixture = createFixture({
      tenantMatches: [{
        id: "tenant-1",
        name: "HDK Beauty I Pvt. Ltd.",
        slug: "hdk-beauty-i-pvt-ltd",
        isActive: false,
      }],
    });
    await expect(bootstrapAppointmentPermissions(fixture.prisma)).rejects.toThrow(
      "Target tenant is inactive",
    );
  });

  it("fails closed when the target role is missing", async () => {
    const fixture = createFixture({ roleMatches: [] });
    await expect(bootstrapAppointmentPermissions(fixture.prisma)).rejects.toThrow(
      "Target role not found; run the initial hierarchy bootstrap first",
    );
  });

  it("fails closed when the target role is conflicting", async () => {
    const fixture = createFixture({
      roleMatches: [{
        id: "role-1",
        code: "tenant-admin",
        name: "Conflicting Name",
        isActive: true,
        permissions: [],
      }],
    });
    await expect(bootstrapAppointmentPermissions(fixture.prisma)).rejects.toThrow(
      "Conflicting target role record",
    );
  });

  it("fails closed on ambiguous tenant records", async () => {
    const fixture = createFixture({
      tenantMatches: [
        { id: "t1", name: "HDK Beauty I Pvt. Ltd.", slug: "hdk-beauty-i-pvt-ltd", isActive: true },
        { id: "t2", name: "HDK Beauty I Pvt. Ltd.", slug: "hdk-beauty-i-pvt-ltd-2", isActive: true },
      ],
    });
    await expect(bootstrapAppointmentPermissions(fixture.prisma)).rejects.toThrow(
      "Ambiguous target tenant records",
    );
  });

  it("fails closed on ambiguous role records", async () => {
    const fixture = createFixture({
      roleMatches: [
        { id: "r1", code: "tenant-admin", name: "Tenant Admin", isActive: true, permissions: [] },
        { id: "r2", code: "tenant-admin", name: "Tenant Admin", isActive: true, permissions: [] },
      ],
    });
    await expect(bootstrapAppointmentPermissions(fixture.prisma)).rejects.toThrow(
      "Ambiguous target role records",
    );
  });
});
