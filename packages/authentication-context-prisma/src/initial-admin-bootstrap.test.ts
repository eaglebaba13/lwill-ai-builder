import { describe, expect, it, vi } from "vitest";
import { verifyPasswordHash } from "./auth-persistence";
import {
  bootstrapInitialAdmin,
  formatInitialAdminBootstrapError,
  formatInitialAdminBootstrapResult,
  readInitialAdminBootstrapEnvironment,
  type InitialAdminBootstrapPrismaClient,
} from "./initial-admin-bootstrap";

function createFixture(overrides: {
  missingTenant?: boolean;
  missingRole?: boolean;
  emptyRole?: boolean;
} = {}) {
  const state = {
    user: null as null | { id: string; displayName: string | null; isActive: boolean },
    credential: null as null | { passwordHash: string; passwordVersion: number },
    membership: null as null | { id: string; isActive: boolean },
    roleAssignment: null as null | { id: string },
  };
  const transaction = {
    tenant: {
      findMany: vi.fn().mockResolvedValue(
        overrides.missingTenant
          ? []
          : [{ id: "tenant-1", businessUnits: [{ id: "business-unit-1" }] }],
      ),
    },
    role: {
      findFirst: vi.fn().mockResolvedValue(
        overrides.missingRole
          ? null
          : {
              id: "role-1",
              code: "tenant-admin",
              permissions: overrides.emptyRole
                ? []
                : [{ permission: { code: "tenant.manage" } }],
            },
      ),
    },
    user: {
      findUnique: vi.fn(async () => state.user),
      create: vi.fn(async ({ data }) => {
        state.user = { id: "user-1", displayName: data.displayName, isActive: true };
        return state.user;
      }),
      update: vi.fn(async ({ data }) => {
        if (state.user !== null) state.user.displayName = data.displayName;
      }),
    },
    passwordCredential: {
      findUnique: vi.fn(async () => state.credential),
      create: vi.fn(async ({ data }) => {
        state.credential = { passwordHash: data.passwordHash, passwordVersion: 1 };
      }),
      update: vi.fn(async ({ data }) => {
        state.credential = {
          passwordHash: data.passwordHash,
          passwordVersion: data.passwordVersion,
        };
      }),
    },
    tenantMembership: {
      findUnique: vi.fn(async () => state.membership),
      create: vi.fn(async () => {
        state.membership = { id: "membership-1", isActive: true };
        return state.membership;
      }),
    },
    membershipRole: {
      findFirst: vi.fn(async () => state.roleAssignment),
      create: vi.fn(async () => {
        state.roleAssignment = { id: "assignment-1" };
      }),
    },
  };
  const prisma: InitialAdminBootstrapPrismaClient = {
    $transaction: vi.fn(async (callback) => callback(transaction as never)),
  };
  return { prisma, state, transaction };
}

const input = {
  email: "admin@example.test",
  password: "bootstrap-secret-value",
  displayName: "Initial Admin",
  updatePassword: false,
};

describe("initial administrative bootstrap", () => {
  it("creates the first administrator with an Argon2 password hash", async () => {
    const fixture = createFixture();
    const result = await bootstrapInitialAdmin(fixture.prisma, input);

    expect(result).toMatchObject({
      roleCode: "tenant-admin",
      userCreated: true,
      membershipCreated: true,
      roleAssignmentCreated: true,
      passwordCreated: true,
      passwordUpdated: false,
    });
    expect(fixture.state.credential?.passwordHash).not.toBe(input.password);
    expect(
      await verifyPasswordHash(input.password, fixture.state.credential?.passwordHash ?? ""),
    ).toBe(true);
  });

  it("is idempotent and does not overwrite an existing password by default", async () => {
    const fixture = createFixture();
    await bootstrapInitialAdmin(fixture.prisma, input);
    const existingHash = fixture.state.credential?.passwordHash;
    const result = await bootstrapInitialAdmin(fixture.prisma, {
      ...input,
      password: "different-secret-value",
    });

    expect(result).toMatchObject({
      userCreated: false,
      membershipCreated: false,
      roleAssignmentCreated: false,
      passwordCreated: false,
      passwordUpdated: false,
    });
    expect(fixture.state.credential?.passwordHash).toBe(existingHash);
    expect(fixture.transaction.user.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.tenantMembership.create).toHaveBeenCalledOnce();
    expect(fixture.transaction.membershipRole.create).toHaveBeenCalledOnce();
  });

  it("updates an existing password only in explicit update mode", async () => {
    const fixture = createFixture();
    await bootstrapInitialAdmin(fixture.prisma, input);
    const previousHash = fixture.state.credential?.passwordHash;
    const result = await bootstrapInitialAdmin(fixture.prisma, {
      ...input,
      password: "replacement-secret-value",
      updatePassword: true,
    });

    expect(result.passwordUpdated).toBe(true);
    expect(fixture.state.credential?.passwordHash).not.toBe(previousHash);
    expect(fixture.state.credential?.passwordVersion).toBe(2);
  });

  it.each([
    ["LWILL_BOOTSTRAP_ADMIN_EMAIL", {
      LWILL_BOOTSTRAP_ADMIN_PASSWORD: "secret",
      LWILL_BOOTSTRAP_ADMIN_DISPLAY_NAME: "Admin",
    }],
    ["LWILL_BOOTSTRAP_ADMIN_PASSWORD", {
      LWILL_BOOTSTRAP_ADMIN_EMAIL: "admin@example.test",
      LWILL_BOOTSTRAP_ADMIN_DISPLAY_NAME: "Admin",
    }],
    ["LWILL_BOOTSTRAP_ADMIN_DISPLAY_NAME", {
      LWILL_BOOTSTRAP_ADMIN_EMAIL: "admin@example.test",
      LWILL_BOOTSTRAP_ADMIN_PASSWORD: "secret",
    }],
  ])("rejects missing required environment variable %s", (name, environment) => {
    expect(() => readInitialAdminBootstrapEnvironment(environment)).toThrow(
      `Missing required environment variable: ${name}`,
    );
  });

  it("fails closed when the target hierarchy is missing", async () => {
    await expect(
      bootstrapInitialAdmin(createFixture({ missingTenant: true }).prisma, input),
    ).rejects.toThrow("Missing or ambiguous active hierarchy");
  });

  it("fails closed when the approved admin role is missing or empty", async () => {
    await expect(
      bootstrapInitialAdmin(createFixture({ missingRole: true }).prisma, input),
    ).rejects.toThrow("Missing approved active tenant administrative role: tenant-admin");
    await expect(
      bootstrapInitialAdmin(createFixture({ emptyRole: true }).prisma, input),
    ).rejects.toThrow(
      "Tenant administrative role does not have the approved permission set: tenant-admin",
    );
  });

  it("does not return or log plaintext credentials or hashes", async () => {
    const fixture = createFixture();
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await bootstrapInitialAdmin(fixture.prisma, input);
    const serializedResult = JSON.stringify(result);
    const formattedResult = formatInitialAdminBootstrapResult(result);

    expect(serializedResult).not.toContain(input.password);
    expect(serializedResult).not.toContain(fixture.state.credential?.passwordHash);
    expect(formattedResult).not.toContain(input.password);
    expect(formattedResult).not.toContain(fixture.state.credential?.passwordHash);
    expect(formatInitialAdminBootstrapError(new Error(input.password))).toBe(
      "Initial admin bootstrap failed",
    );
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });
});
