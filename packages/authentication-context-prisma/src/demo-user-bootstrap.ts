import { createPasswordHash } from "./auth-persistence";

export class DemoUserBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoUserBootstrapError";
  }
}

export interface DemoUserInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly roleCode: string;
  readonly updatePassword: boolean;
}

export interface DemoUserResult {
  readonly email: string;
  readonly roleCode: string;
  readonly userId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly userCreated: boolean;
  readonly membershipCreated: boolean;
  readonly roleAssignmentCreated: boolean;
  readonly passwordCreated: boolean;
  readonly passwordUpdated: boolean;
}

export interface DemoUserBootstrapInput {
  readonly tenantDomain: string;
  readonly users: readonly DemoUserInput[];
}

export interface DemoUserBootstrapResult {
  readonly tenantId: string;
  readonly users: readonly DemoUserResult[];
}

interface DemoUserBootstrapPrismaClient {
  readonly tenantDomain: {
    findFirst(args: {
      where: {
        domain: string;
        isActive: boolean;
        verificationStatus: string;
        tenant: { isActive: boolean };
      };
      include: { tenant: { select: { id: true; isActive: true } } };
    }): Promise<{ id: string; tenantId: string; tenant: { id: string; isActive: boolean } } | null>;
  };
  readonly role: {
    findFirst(args: {
      where: { tenantId: string; code: string; isActive: boolean };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  readonly user: {
    findUnique(args: { where: { email: string } }): Promise<{ id: string; displayName: string | null; isActive: boolean } | null>;
    create(args: { data: { email: string; displayName: string; isActive: boolean } }): Promise<{ id: string }>;
    update(args: { where: { id: string }; data: { displayName: string } }): Promise<unknown>;
  };
  readonly passwordCredential: {
    findUnique(args: { where: { userId: string } }): Promise<{ passwordVersion: number } | null>;
    create(args: { data: { userId: string; passwordHash: string } }): Promise<unknown>;
    update(args: { where: { userId: string }; data: { passwordHash: string; passwordUpdatedAt: Date; passwordVersion: number } }): Promise<unknown>;
  };
  readonly tenantMembership: {
    findUnique(args: { where: { tenantId_userId: { tenantId: string; userId: string } } }): Promise<{ id: string; isActive: boolean } | null>;
    create(args: { data: { tenantId: string; userId: string; isActive: boolean } }): Promise<{ id: string }>;
  };
  readonly membershipRole: {
    findFirst(args: { where: { tenantId: string; membershipId: string; roleId: string } }): Promise<{ id: string } | null>;
    create(args: { data: { tenantId: string; membershipId: string; roleId: string } }): Promise<unknown>;
  };
}

function requireString(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new DemoUserBootstrapError(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function readDemoUserBootstrapEnvironment(
  environment: Record<string, string | undefined>,
): DemoUserBootstrapInput {
  const rawDomain = requireString("LWILL_DEMO_TENANT_DOMAIN", environment.LWILL_DEMO_TENANT_DOMAIN);
  const tenantDomain = rawDomain.trim().toLowerCase().replace(/^www\./, "");

  const users: DemoUserInput[] = [
    {
      email: requireString("LWILL_DEMO_ADMIN_EMAIL", environment.LWILL_DEMO_ADMIN_EMAIL).toLowerCase(),
      password: requireString("LWILL_DEMO_ADMIN_PASSWORD", environment.LWILL_DEMO_ADMIN_PASSWORD),
      displayName: requireString("LWILL_DEMO_ADMIN_DISPLAY_NAME", environment.LWILL_DEMO_ADMIN_DISPLAY_NAME),
      roleCode: "tenant-admin",
      updatePassword: false,
    },
    {
      email: requireString("LWILL_DEMO_BRANCH_MANAGER_EMAIL", environment.LWILL_DEMO_BRANCH_MANAGER_EMAIL).toLowerCase(),
      password: requireString("LWILL_DEMO_BRANCH_MANAGER_PASSWORD", environment.LWILL_DEMO_BRANCH_MANAGER_PASSWORD),
      displayName: requireString("LWILL_DEMO_BRANCH_MANAGER_DISPLAY_NAME", environment.LWILL_DEMO_BRANCH_MANAGER_DISPLAY_NAME),
      roleCode: "branch-manager",
      updatePassword: false,
    },
    {
      email: requireString("LWILL_DEMO_STAFF_EMAIL", environment.LWILL_DEMO_STAFF_EMAIL).toLowerCase(),
      password: requireString("LWILL_DEMO_STAFF_PASSWORD", environment.LWILL_DEMO_STAFF_PASSWORD),
      displayName: requireString("LWILL_DEMO_STAFF_DISPLAY_NAME", environment.LWILL_DEMO_STAFF_DISPLAY_NAME),
      roleCode: "staff",
      updatePassword: false,
    },
    {
      email: requireString("LWILL_DEMO_ACCOUNTS_EMAIL", environment.LWILL_DEMO_ACCOUNTS_EMAIL).toLowerCase(),
      password: requireString("LWILL_DEMO_ACCOUNTS_PASSWORD", environment.LWILL_DEMO_ACCOUNTS_PASSWORD),
      displayName: requireString("LWILL_DEMO_ACCOUNTS_DISPLAY_NAME", environment.LWILL_DEMO_ACCOUNTS_DISPLAY_NAME),
      roleCode: "accounts",
      updatePassword: false,
    },
    {
      email: requireString("LWILL_DEMO_FRANCHISE_EMAIL", environment.LWILL_DEMO_FRANCHISE_EMAIL).toLowerCase(),
      password: requireString("LWILL_DEMO_FRANCHISE_PASSWORD", environment.LWILL_DEMO_FRANCHISE_PASSWORD),
      displayName: requireString("LWILL_DEMO_FRANCHISE_DISPLAY_NAME", environment.LWILL_DEMO_FRANCHISE_DISPLAY_NAME),
      roleCode: "franchise",
      updatePassword: false,
    },
  ];

  return { tenantDomain, users };
}

export async function bootstrapDemoUsers(
  prisma: DemoUserBootstrapPrismaClient,
  input: DemoUserBootstrapInput,
  hashPassword: (password: string) => Promise<string> = createPasswordHash,
): Promise<DemoUserBootstrapResult> {
  const normalizedDomain = input.tenantDomain.trim().toLowerCase().replace(/^www\./, "");

  const tenantDomainRecord = await prisma.tenantDomain.findFirst({
    where: {
      domain: { in: [normalizedDomain, `www.${normalizedDomain}`] },
      isActive: true,
      verificationStatus: "verified",
      tenant: { isActive: true },
    },
    include: { tenant: { select: { id: true, isActive: true } } },
  });

  if (tenantDomainRecord === null || tenantDomainRecord.tenant === null || !tenantDomainRecord.tenant.isActive) {
    throw new DemoUserBootstrapError(`Verified active tenant domain not found: ${input.tenantDomain}`);
  }

  const tenantId = tenantDomainRecord.tenantId;

  const users: DemoUserResult[] = [];

  for (const userInput of input.users) {
    let user = await prisma.user.findUnique({ where: { email: userInput.email } });
    const userCreated = user === null;

    if (userCreated) {
      user = await prisma.user.create({
        data: {
          email: userInput.email,
          displayName: userInput.displayName,
          isActive: true,
        },
      });
    } else {
      if (!user.isActive) {
        throw new DemoUserBootstrapError(`Existing user is inactive: ${userInput.email}`);
      }
      if (user.displayName !== userInput.displayName) {
        await prisma.user.update({
          where: { id: user.id },
          data: { displayName: userInput.displayName },
        });
      }
    }

    const credential = await prisma.passwordCredential.findUnique({
      where: { userId: user.id },
    });

    let passwordCreated = false;
    let passwordUpdated = false;

    if (credential === null || userInput.updatePassword) {
      const passwordHash = await hashPassword(userInput.password);
      if (credential === null) {
        await prisma.passwordCredential.create({
          data: { userId: user.id, passwordHash },
        });
        passwordCreated = true;
      } else {
        await prisma.passwordCredential.update({
          where: { userId: user.id },
          data: {
            passwordHash,
            passwordUpdatedAt: new Date(),
            passwordVersion: credential.passwordVersion + 1,
          },
        });
        passwordUpdated = true;
      }
    }

    let membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });
    const membershipCreated = membership === null;

    if (membership === null) {
      membership = await prisma.tenantMembership.create({
        data: { tenantId, userId: user.id, isActive: true },
      });
    } else {
      if (!membership.isActive) {
        throw new DemoUserBootstrapError(`Existing tenant membership is inactive for user: ${userInput.email}`);
      }
    }

    const role = await prisma.role.findFirst({
      where: { tenantId, code: userInput.roleCode, isActive: true },
      select: { id: true },
    });

    if (role === null) {
      throw new DemoUserBootstrapError(`Missing active role in tenant: ${userInput.roleCode}`);
    }

    const existingAssignment = await prisma.membershipRole.findFirst({
      where: { tenantId, membershipId: membership.id, roleId: role.id },
    });
    const roleAssignmentCreated = existingAssignment === null;

    if (existingAssignment === null) {
      await prisma.membershipRole.create({
        data: { tenantId, membershipId: membership.id, roleId: role.id },
      });
    }

    users.push({
      email: userInput.email,
      roleCode: userInput.roleCode,
      userId: user.id,
      membershipId: membership.id,
      roleId: role.id,
      userCreated,
      membershipCreated,
      roleAssignmentCreated,
      passwordCreated,
      passwordUpdated,
    });
  }

  return { tenantId, users };
}

export function formatDemoUserBootstrapResult(result: DemoUserBootstrapResult): string {
  return JSON.stringify({
    status: "completed",
    tenantId: result.tenantId,
    users: result.users.map((user) => ({
      email: user.email,
      roleCode: user.roleCode,
      userId: user.userId,
      membershipId: user.membershipId,
      roleId: user.roleId,
      userCreated: user.userCreated,
      membershipCreated: user.membershipCreated,
      roleAssignmentCreated: user.roleAssignmentCreated,
      passwordCreated: user.passwordCreated,
      passwordUpdated: user.passwordUpdated,
    })),
  });
}

export function formatDemoUserBootstrapError(error: unknown): string {
  return error instanceof DemoUserBootstrapError
    ? error.message
    : "Demo user bootstrap failed";
}
