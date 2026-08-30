import { describe, expect, it, vi } from "vitest";
import {
  bootstrapDemoUsers,
  formatDemoUserBootstrapError,
  formatDemoUserBootstrapResult,
  readDemoUserBootstrapEnvironment,
  type DemoUserBootstrapInput,
  type DemoUserBootstrapResult,
  DemoUserBootstrapError,
} from "./demo-user-bootstrap";

interface TestPrismaClient {
  readonly tenantDomain: {
    findFirst: (args: {
      where: {
        domain: { in: string[] };
        isActive: boolean;
        verificationStatus: string;
        tenant: { isActive: boolean };
      };
      include: { tenant: { select: { id: string; isActive: boolean } } };
    }) => Promise<{ id: string; tenantId: string; tenant: { id: string; isActive: boolean } } | null>;
  };
  readonly role: {
    findFirst: (args: { where: { tenantId: string; code: string; isActive: boolean }; select: { id: true } }) => Promise<{ id: string } | null>;
  };
  readonly user: {
    findUnique: (args: { where: { email: string } }) => Promise<{ id: string; displayName: string | null; isActive: boolean } | null>;
    create: (args: { data: { email: string; displayName: string; isActive: boolean } }) => Promise<{ id: string }>;
    update: (args: { where: { id: string }; data: { displayName: string } }) => Promise<unknown>;
  };
  readonly passwordCredential: {
    findUnique: (args: { where: { userId: string } }) => Promise<{ passwordVersion: number } | null>;
    create: (args: { data: { userId: string; passwordHash: string } }) => Promise<unknown>;
    update: (args: { where: { userId: string }; data: { passwordHash: string; passwordUpdatedAt: Date; passwordVersion: number } }) => Promise<unknown>;
  };
  readonly tenantMembership: {
    findUnique: (args: { where: { tenantId_userId: { tenantId: string; userId: string } } }) => Promise<{ id: string; isActive: boolean } | null>;
    create: (args: { data: { tenantId: string; userId: string; isActive: boolean } }) => Promise<{ id: string }>;
  };
  readonly membershipRole: {
    findFirst: (args: { where: { tenantId: string; membershipId: string; roleId: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: { tenantId: string; membershipId: string; roleId: string } }) => Promise<unknown>;
  };
}

function createFixture(overrides: {
  tenantDomain?: { id: string; tenantId: string; tenant: { id: string; isActive: boolean } } | null;
  roles?: Record<string, { id: string } | null>;
}): { prisma: TestPrismaClient; calls: Record<string, unknown[]> } {
  const calls: Record<string, unknown[]> = {};
  const users = new Map<string, { id: string; displayName: string | null; isActive: boolean }>();
  const passwordCredentials = new Map<string, { passwordVersion: number }>();
  const memberships = new Map<string, { id: string; isActive: boolean }>();
  const membershipRoles = new Map<string, { id: string }>();

  if (overrides.tenantDomain) {
    users.set("existing@example.test", { id: "user-1", displayName: "Existing User", isActive: true });
    users.set("inactive@example.test", { id: "user-2", displayName: "Inactive", isActive: false });
  }

  const prisma: TestPrismaClient = {
    tenantDomain: {
      findFirst: async (args) => {
        calls.tenantDomainFindFirst = calls.tenantDomainFindFirst || [];
        calls.tenantDomainFindFirst.push(args);
        return overrides.tenantDomain ?? null;
      },
    },
    role: {
      findFirst: async (args) => {
        calls.roleFindFirst = calls.roleFindFirst || [];
        calls.roleFindFirst.push(args);
        const code = args.where.code;
        return overrides.roles?.[code] ?? null;
      },
    },
    user: {
      findUnique: async (args) => {
        calls.userFindUnique = calls.userFindUnique || [];
        calls.userFindUnique.push(args);
        return users.get(args.where.email) ?? null;
      },
      create: async (args) => {
        calls.userCreate = calls.userCreate || [];
        calls.userCreate.push(args);
        const id = `user-${(calls.userCreate?.length ?? 0)}`;
        const user = { id, ...args.data };
        users.set(args.data.email, user);
        return user;
      },
      update: async (args) => {
        calls.userUpdate = calls.userUpdate || [];
        calls.userUpdate.push(args);
        const existing = users.get((args as { where: { id: string } }).where.id);
        if (existing) {
          const updated = { ...existing, displayName: (args as { data: { displayName: string } }).data.displayName };
          users.set((args as { where: { id: string } }).where.id, updated);
          // Also update by email if we can find it
          for (const [email, user] of users) {
            if (user.id === updated.id) {
              users.set(email, updated);
            }
          }
        }
        return args;
      },
    },
    passwordCredential: {
      findUnique: async (args) => {
        calls.passwordCredentialFindUnique = calls.passwordCredentialFindUnique || [];
        calls.passwordCredentialFindUnique.push(args);
        const userId = (args as { where: { userId: string } }).where.userId;
        return passwordCredentials.get(userId) ?? null;
      },
      create: async (args) => {
        calls.passwordCredentialCreate = calls.passwordCredentialCreate || [];
        calls.passwordCredentialCreate.push(args);
        const userId = (args as { data: { userId: string } }).data.userId;
        passwordCredentials.set(userId, { passwordVersion: 1 });
        return args;
      },
      update: async (args) => {
        calls.passwordCredentialUpdate = calls.passwordCredentialUpdate || [];
        calls.passwordCredentialUpdate.push(args);
        const userId = (args as { where: { userId: string } }).where.userId;
        const existing = passwordCredentials.get(userId);
        if (existing) {
          passwordCredentials.set(userId, { passwordVersion: existing.passwordVersion + 1 });
        }
        return args;
      },
    },
    tenantMembership: {
      findUnique: async (args) => {
        calls.tenantMembershipFindUnique = calls.tenantMembershipFindUnique || [];
        calls.tenantMembershipFindUnique.push(args);
        const key = `${(args as { where: { tenantId_userId: { tenantId: string; userId: string } } }).where.tenantId_userId.tenantId}:${(args as { where: { tenantId_userId: { tenantId: string; userId: string } } }).where.tenantId_userId.userId}`;
        return memberships.get(key) ?? null;
      },
      create: async (args) => {
        calls.tenantMembershipCreate = calls.tenantMembershipCreate || [];
        calls.tenantMembershipCreate.push(args);
        const data = args.data as { tenantId: string; userId: string; isActive: boolean };
        const id = `membership-${(calls.tenantMembershipCreate?.length ?? 0)}`;
        const membership = { id, ...data };
        const key = `${data.tenantId}:${data.userId}`;
        memberships.set(key, membership);
        return membership;
      },
    },
    membershipRole: {
      findFirst: async (args) => {
        calls.membershipRoleFindFirst = calls.membershipRoleFindFirst || [];
        calls.membershipRoleFindFirst.push(args);
        const where = args as { where: { tenantId: string; membershipId: string; roleId: string } };
        const key = `${where.where.tenantId}:${where.where.membershipId}:${where.where.roleId}`;
        return membershipRoles.get(key) ?? null;
      },
      create: async (args) => {
        calls.membershipRoleCreate = calls.membershipRoleCreate || [];
        calls.membershipRoleCreate.push(args);
        const data = args.data as { tenantId: string; membershipId: string; roleId: string };
        const id = `membership-role-${(calls.membershipRoleCreate?.length ?? 0)}`;
        const record = { id, ...data };
        const key = `${data.tenantId}:${data.membershipId}:${data.roleId}`;
        membershipRoles.set(key, record);
        return record;
      },
    },
  };

  return { prisma, calls };
}

describe("demo-user-bootstrap", () => {
  it("fails when tenant domain is missing", () => {
    expect(() =>
      readDemoUserBootstrapEnvironment({}),
    ).toThrow("Missing required environment variable: LWILL_DEMO_TENANT_DOMAIN");
  });

  it("fails when any demo user field is missing", () => {
    expect(() =>
      readDemoUserBootstrapEnvironment({
        LWILL_DEMO_TENANT_DOMAIN: "xnail.makemeartist.com",
      }),
    ).toThrow("Missing required environment variable: LWILL_DEMO_ADMIN_EMAIL");
  });

  it("creates new users, memberships, roles, and password hashes", async () => {
    const hashPassword = async (password: string) => `hashed-${password}`;
    const { prisma, calls } = createFixture({
      tenantDomain: { id: "td-1", tenantId: "tenant-1", tenant: { id: "tenant-1", isActive: true } },
      roles: {
        "tenant-admin": { id: "role-1" },
        "branch-manager": { id: "role-2" },
        "staff": { id: "role-3" },
        "accounts": { id: "role-4" },
        "franchise": { id: "role-5" },
      },
    });

    const input: DemoUserBootstrapInput = {
      tenantDomain: "xnail.makemeartist.com",
      users: [
        { email: "admin@example.test", password: "pass1", displayName: "Admin", roleCode: "tenant-admin", updatePassword: false },
        { email: "bm@example.test", password: "pass2", displayName: "Branch Manager", roleCode: "branch-manager", updatePassword: false },
        { email: "staff@example.test", password: "pass3", displayName: "Staff", roleCode: "staff", updatePassword: false },
        { email: "accounts@example.test", password: "pass4", displayName: "Accounts", roleCode: "accounts", updatePassword: false },
        { email: "franchise@example.test", password: "pass5", displayName: "Franchise", roleCode: "franchise", updatePassword: false },
      ],
    };

    const result: DemoUserBootstrapResult = await bootstrapDemoUsers(prisma, input, async (password) => `hashed-${password}`);

    expect(result.tenantId).toBe("tenant-1");
    expect(result.users).toHaveLength(5);

    const admin = result.users[0];
    expect(admin.email).toBe("admin@example.test");
    expect(admin.roleCode).toBe("tenant-admin");
    expect(admin.userCreated).toBe(true);
    expect(admin.membershipCreated).toBe(true);
    expect(admin.roleAssignmentCreated).toBe(true);
    expect(admin.passwordCreated).toBe(true);
    expect(admin.passwordUpdated).toBe(false);

    expect(calls.userCreate).toHaveLength(5);
    expect(calls.passwordCredentialCreate).toHaveLength(5);
    expect(calls.tenantMembershipCreate).toHaveLength(5);
    expect(calls.membershipRoleCreate).toHaveLength(5);
  });

  it("is idempotent on second run", async () => {
    const { prisma } = createFixture({
      tenantDomain: { id: "td-1", tenantId: "tenant-1", tenant: { id: "tenant-1", isActive: true } },
      roles: {
        "tenant-admin": { id: "role-1" },
        "branch-manager": { id: "role-2" },
        "staff": { id: "role-3" },
        "accounts": { id: "role-4" },
        "franchise": { id: "role-5" },
      },
    });

    const input: DemoUserBootstrapInput = {
      tenantDomain: "xnail.makemeartist.com",
      users: [
        { email: "admin@example.test", password: "pass1", displayName: "Admin", roleCode: "tenant-admin", updatePassword: false },
      ],
    };

    const first = await bootstrapDemoUsers(prisma, input, async (password) => `hashed-${password}`);
    const second = await bootstrapDemoUsers(prisma, input, async (password) => `hashed-${password}`);

    expect(first.users[0].userCreated).toBe(true);
    expect(first.users[0].membershipCreated).toBe(true);
    expect(first.users[0].roleAssignmentCreated).toBe(true);
    expect(first.users[0].passwordCreated).toBe(true);
    expect(first.users[0].passwordUpdated).toBe(false);

    expect(second.users[0].userCreated).toBe(false);
    expect(second.users[0].membershipCreated).toBe(false);
    expect(second.users[0].roleAssignmentCreated).toBe(false);
    expect(second.users[0].passwordCreated).toBe(false);
    expect(second.users[0].passwordUpdated).toBe(false);
  });

  it("updates password when explicitly requested", async () => {
    const { prisma, calls } = createFixture({
      tenantDomain: { id: "td-1", tenantId: "tenant-1", tenant: { id: "tenant-1", isActive: true } },
      roles: { "tenant-admin": { id: "role-1" } },
    });

    const input: DemoUserBootstrapInput = {
      tenantDomain: "xnail.makemeartist.com",
      users: [
        { email: "admin@example.test", password: "pass1", displayName: "Admin", roleCode: "tenant-admin", updatePassword: true },
      ],
    };

    const first = await bootstrapDemoUsers(prisma, input, async (password) => `hashed-${password}`);
    const second = await bootstrapDemoUsers(prisma, input, async (password) => `hashed-${password}`);

    expect(first.users[0].passwordCreated).toBe(true);
    expect(first.users[0].passwordUpdated).toBe(false);

    expect(second.users[0].passwordCreated).toBe(false);
    expect(second.users[0].passwordUpdated).toBe(true);
    expect(calls.passwordCredentialUpdate).toHaveLength(1);
  });

  it("reuses existing user but creates missing membership and role", async () => {
    const { prisma, calls } = createFixture({
      tenantDomain: { id: "td-1", tenantId: "tenant-1", tenant: { id: "tenant-1", isActive: true } },
      roles: { "tenant-admin": { id: "role-1" } },
    });

    const input: DemoUserBootstrapInput = {
      tenantDomain: "xnail.makemeartist.com",
      users: [
        { email: "existing@example.test", password: "newpass", displayName: "Updated Name", roleCode: "tenant-admin", updatePassword: false },
      ],
    };

    const result = await bootstrapDemoUsers(prisma, input, async (password) => `hashed-${password}`);

    expect(result.users[0].userCreated).toBe(false);
    expect(result.users[0].membershipCreated).toBe(true);
    expect(result.users[0].roleAssignmentCreated).toBe(true);
    expect(result.users[0].passwordCreated).toBe(true);
    expect(result.users[0].passwordUpdated).toBe(false);

    expect(calls.userCreate?.length ?? 0).toBe(0);
    expect(calls.userUpdate).toHaveLength(1);
  });

  it("fails when required role is missing", async () => {
    const { prisma } = createFixture({
      tenantDomain: { id: "td-1", tenantId: "tenant-1", tenant: { id: "tenant-1", isActive: true } },
      roles: {},
    });

    const input: DemoUserBootstrapInput = {
      tenantDomain: "xnail.makemeartist.com",
      users: [
        { email: "admin@example.test", password: "pass1", displayName: "Admin", roleCode: "tenant-admin", updatePassword: false },
      ],
    };

    await expect(bootstrapDemoUsers(prisma, input)).rejects.toThrow("Missing active role in tenant: tenant-admin");
  });

  it("fails when tenant domain is not verified", async () => {
    const { prisma } = createFixture({
      tenantDomain: null,
    });

    const input: DemoUserBootstrapInput = {
      tenantDomain: "xnail.makemeartist.com",
      users: [
        { email: "admin@example.test", password: "pass1", displayName: "Admin", roleCode: "tenant-admin", updatePassword: false },
      ],
    };

    await expect(bootstrapDemoUsers(prisma, input)).rejects.toThrow("Verified active tenant domain not found: xnail.makemeartist.com");
  });

  it("fails when existing user is inactive", async () => {
    const { prisma } = createFixture({
      tenantDomain: { id: "td-1", tenantId: "tenant-1", tenant: { id: "tenant-1", isActive: true } },
      roles: { "tenant-admin": { id: "role-1" } },
    });

    const input: DemoUserBootstrapInput = {
      tenantDomain: "xnail.makemeartist.com",
      users: [
        { email: "inactive@example.test", password: "pass1", displayName: "Inactive", roleCode: "tenant-admin", updatePassword: false },
      ],
    };

    await expect(bootstrapDemoUsers(prisma, input)).rejects.toThrow("Existing user is inactive: inactive@example.test");
  });

  it("normalizes email and domain inputs", () => {
    const input = readDemoUserBootstrapEnvironment({
      LWILL_DEMO_TENANT_DOMAIN: "  XNail.MakeMeArtist.com  ",
      LWILL_DEMO_ADMIN_EMAIL: "  Admin@Example.Test  ",
      LWILL_DEMO_ADMIN_PASSWORD: "  password1  ",
      LWILL_DEMO_ADMIN_DISPLAY_NAME: "  Admin User  ",
      LWILL_DEMO_BRANCH_MANAGER_EMAIL: "  bm@example.test  ",
      LWILL_DEMO_BRANCH_MANAGER_PASSWORD: "  password2  ",
      LWILL_DEMO_BRANCH_MANAGER_DISPLAY_NAME: "  Branch Manager  ",
      LWILL_DEMO_STAFF_EMAIL: "  staff@example.test  ",
      LWILL_DEMO_STAFF_PASSWORD: "  password3  ",
      LWILL_DEMO_STAFF_DISPLAY_NAME: "  Staff User  ",
      LWILL_DEMO_ACCOUNTS_EMAIL: "  accounts@example.test  ",
      LWILL_DEMO_ACCOUNTS_PASSWORD: "  password4  ",
      LWILL_DEMO_ACCOUNTS_DISPLAY_NAME: "  Accounts User  ",
      LWILL_DEMO_FRANCHISE_EMAIL: "  franchise@example.test  ",
      LWILL_DEMO_FRANCHISE_PASSWORD: "  password5  ",
      LWILL_DEMO_FRANCHISE_DISPLAY_NAME: "  Franchise User  ",
    });

    expect(input.tenantDomain).toBe("xnail.makemeartist.com");
    expect(input.users[0].email).toBe("admin@example.test");
    expect(input.users[0].displayName).toBe("Admin User");
    expect(input.users[0].password).toBe("password1");
  });

  it("does not emit passwords in formatted output", () => {
    const result = formatDemoUserBootstrapResult({
      tenantId: "tenant-1",
      users: [
        {
          email: "admin@example.test",
          roleCode: "tenant-admin",
          userId: "user-1",
          membershipId: "membership-1",
          roleId: "role-1",
          userCreated: true,
          membershipCreated: true,
          roleAssignmentCreated: true,
          passwordCreated: true,
          passwordUpdated: false,
        },
      ],
    });

    expect(result).not.toContain("password1");
    expect(result).not.toContain("secret");
    expect(JSON.parse(result).users[0]).not.toHaveProperty("password");
  });

  it("formats errors safely", () => {
    expect(formatDemoUserBootstrapError(new Error("unknown"))).toBe("Demo user bootstrap failed");
    expect(formatDemoUserBootstrapError(new DemoUserBootstrapError("missing role"))).toBe("missing role");
  });
});
