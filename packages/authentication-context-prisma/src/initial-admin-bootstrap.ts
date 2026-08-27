import { createPasswordHash } from "./auth-persistence";
import {
  INITIAL_BUSINESS_UNIT,
  INITIAL_TENANT,
  INITIAL_TENANT_ADMIN_PERMISSION_CODES,
  INITIAL_TENANT_ADMIN_ROLE,
} from "./initial-hierarchy-bootstrap";

export const INITIAL_ADMIN_TENANT_NAME = INITIAL_TENANT.name;
export const INITIAL_ADMIN_BUSINESS_UNIT_NAME = INITIAL_BUSINESS_UNIT.name;
export const INITIAL_ADMIN_ROLE_CODE = INITIAL_TENANT_ADMIN_ROLE.code;

export class InitialAdminBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitialAdminBootstrapError";
  }
}

export interface InitialAdminBootstrapEnvironment {
  readonly LWILL_BOOTSTRAP_ADMIN_EMAIL?: string;
  readonly LWILL_BOOTSTRAP_ADMIN_PASSWORD?: string;
  readonly LWILL_BOOTSTRAP_ADMIN_DISPLAY_NAME?: string;
}

export interface InitialAdminBootstrapInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly updatePassword: boolean;
}

export interface InitialAdminBootstrapResult {
  readonly tenantName: string;
  readonly businessUnitName: string;
  readonly roleCode: string;
  readonly userCreated: boolean;
  readonly membershipCreated: boolean;
  readonly roleAssignmentCreated: boolean;
  readonly passwordCreated: boolean;
  readonly passwordUpdated: boolean;
}

export function formatInitialAdminBootstrapResult(
  result: InitialAdminBootstrapResult,
): string {
  return JSON.stringify({
    status: "completed",
    tenantName: result.tenantName,
    businessUnitName: result.businessUnitName,
    roleCode: result.roleCode,
    userCreated: result.userCreated,
    membershipCreated: result.membershipCreated,
    roleAssignmentCreated: result.roleAssignmentCreated,
    passwordCreated: result.passwordCreated,
    passwordUpdated: result.passwordUpdated,
  });
}

export function formatInitialAdminBootstrapError(error: unknown): string {
  return error instanceof InitialAdminBootstrapError
    ? error.message
    : "Initial admin bootstrap failed";
}

interface BootstrapTransactionClient {
  readonly tenant: {
    findMany(args: {
      where: { name: string; isActive: true };
      select: {
        id: true;
        businessUnits: {
          where: { name: string; isActive: true };
          select: { id: true };
        };
      };
    }): Promise<Array<{ id: string; businessUnits: Array<{ id: string }> }>>;
  };
  readonly role: {
    findFirst(args: {
      where: { tenantId: string; code: string; isActive: true };
      select: {
        id: true;
        code: true;
        permissions: {
          select: { permission: { select: { code: true } } };
        };
      };
    }): Promise<{
      id: string;
      code: string;
      permissions: Array<{ permission: { code: string } }>;
    } | null>;
  };
  readonly user: {
    findUnique(args: { where: { email: string } }): Promise<{
      id: string;
      displayName: string | null;
      isActive: boolean;
    } | null>;
    create(args: {
      data: { email: string; displayName: string; isActive: true };
    }): Promise<{ id: string; displayName: string | null; isActive: boolean }>;
    update(args: {
      where: { id: string };
      data: { displayName: string };
    }): Promise<unknown>;
  };
  readonly passwordCredential: {
    findUnique(args: { where: { userId: string } }): Promise<{
      passwordVersion: number;
    } | null>;
    create(args: {
      data: { userId: string; passwordHash: string };
    }): Promise<unknown>;
    update(args: {
      where: { userId: string };
      data: {
        passwordHash: string;
        passwordUpdatedAt: Date;
        passwordVersion: number;
      };
    }): Promise<unknown>;
  };
  readonly tenantMembership: {
    findUnique(args: {
      where: { tenantId_userId: { tenantId: string; userId: string } };
    }): Promise<{ id: string; isActive: boolean } | null>;
    create(args: {
      data: { tenantId: string; userId: string; isActive: true };
    }): Promise<{ id: string; isActive: boolean }>;
  };
  readonly membershipRole: {
    findFirst(args: {
      where: { tenantId: string; membershipId: string; roleId: string };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: { tenantId: string; membershipId: string; roleId: string };
    }): Promise<unknown>;
  };
}

export interface InitialAdminBootstrapPrismaClient {
  $transaction<T>(callback: (transaction: BootstrapTransactionClient) => Promise<T>): Promise<T>;
}

function requireEnvironmentValue(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new InitialAdminBootstrapError(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function readInitialAdminBootstrapEnvironment(
  environment: InitialAdminBootstrapEnvironment,
  updatePassword = false,
): InitialAdminBootstrapInput {
  return {
    email: requireEnvironmentValue(
      "LWILL_BOOTSTRAP_ADMIN_EMAIL",
      environment.LWILL_BOOTSTRAP_ADMIN_EMAIL,
    ).trim().toLowerCase(),
    password: requireEnvironmentValue(
      "LWILL_BOOTSTRAP_ADMIN_PASSWORD",
      environment.LWILL_BOOTSTRAP_ADMIN_PASSWORD,
    ),
    displayName: requireEnvironmentValue(
      "LWILL_BOOTSTRAP_ADMIN_DISPLAY_NAME",
      environment.LWILL_BOOTSTRAP_ADMIN_DISPLAY_NAME,
    ).trim(),
    updatePassword,
  };
}

export async function bootstrapInitialAdmin(
  prisma: InitialAdminBootstrapPrismaClient,
  input: InitialAdminBootstrapInput,
  hashPassword: (password: string) => Promise<string> = createPasswordHash,
): Promise<InitialAdminBootstrapResult> {
  return prisma.$transaction(async (transaction) => {
    const tenants = await transaction.tenant.findMany({
      where: { name: INITIAL_ADMIN_TENANT_NAME, isActive: true },
      select: {
        id: true,
        businessUnits: {
          where: { name: INITIAL_ADMIN_BUSINESS_UNIT_NAME, isActive: true },
          select: { id: true },
        },
      },
    });
    if (tenants.length !== 1 || tenants[0]?.businessUnits.length !== 1) {
      throw new InitialAdminBootstrapError(
        `Missing or ambiguous active hierarchy: ${INITIAL_ADMIN_TENANT_NAME} -> ${INITIAL_ADMIN_BUSINESS_UNIT_NAME}`,
      );
    }
    const tenantId = tenants[0].id;

    let user = await transaction.user.findUnique({ where: { email: input.email } });
    const userCreated = user === null;

    if (userCreated && input.updatePassword) {
      throw new InitialAdminBootstrapError(
        "Existing bootstrap administrator user is missing",
      );
    }

    if (!input.updatePassword || userCreated) {
      const role = await transaction.role.findFirst({
        where: {
          tenantId,
          code: INITIAL_ADMIN_ROLE_CODE,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          permissions: {
            select: { permission: { select: { code: true } } },
          },
        },
      });
      if (role === null) {
        throw new InitialAdminBootstrapError(
          `Missing approved active tenant administrative role: ${INITIAL_ADMIN_ROLE_CODE}`,
        );
      }
      const actualPermissionCodes = role.permissions
        .map(({ permission }) => permission.code)
        .sort();
      const approvedPermissionCodes = [...INITIAL_TENANT_ADMIN_PERMISSION_CODES].sort();
      if (
        actualPermissionCodes.length !== approvedPermissionCodes.length
        || actualPermissionCodes.some((code, index) => code !== approvedPermissionCodes[index])
      ) {
        throw new InitialAdminBootstrapError(
          `Tenant administrative role does not have the approved permission set: ${INITIAL_ADMIN_ROLE_CODE}`,
        );
      }

      if (userCreated) {
        user = await transaction.user.create({
          data: {
            email: input.email,
            displayName: input.displayName,
            isActive: true,
          },
        });
      } else {
        if (!user.isActive) {
          throw new InitialAdminBootstrapError("Existing bootstrap administrator user is inactive");
        }
        if (user.displayName !== input.displayName) {
          await transaction.user.update({
            where: { id: user.id },
            data: { displayName: input.displayName },
          });
        }
      }

      const credential = await transaction.passwordCredential.findUnique({
        where: { userId: user.id },
      });
      let passwordCreated = false;
      let passwordUpdated = false;
      if (credential === null) {
        const passwordHash = await hashPassword(input.password);
        await transaction.passwordCredential.create({
          data: { userId: user.id, passwordHash },
        });
        passwordCreated = true;
      } else if (input.updatePassword) {
        const passwordHash = await hashPassword(input.password);
        await transaction.passwordCredential.update({
          where: { userId: user.id },
          data: {
            passwordHash,
            passwordUpdatedAt: new Date(),
            passwordVersion: credential.passwordVersion + 1,
          },
        });
        passwordUpdated = true;
      }

      let membership = await transaction.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: user.id } },
      });
      const membershipCreated = membership === null;
      if (membership === null) {
        membership = await transaction.tenantMembership.create({
          data: { tenantId, userId: user.id, isActive: true },
        });
      } else if (!membership.isActive) {
        throw new InitialAdminBootstrapError(
          "Existing bootstrap administrator tenant membership is inactive",
        );
      }

      const existingAssignment = await transaction.membershipRole.findFirst({
        where: { tenantId, membershipId: membership.id, roleId: role.id },
      });
      const roleAssignmentCreated = existingAssignment === null;
      if (existingAssignment === null) {
        await transaction.membershipRole.create({
          data: { tenantId, membershipId: membership.id, roleId: role.id },
        });
      }

      return {
        tenantName: INITIAL_ADMIN_TENANT_NAME,
        businessUnitName: INITIAL_ADMIN_BUSINESS_UNIT_NAME,
        roleCode: role.code,
        userCreated,
        membershipCreated,
        roleAssignmentCreated,
        passwordCreated,
        passwordUpdated,
      };
    }

    const adminRole = await transaction.role.findFirst({
      where: { tenantId, code: INITIAL_ADMIN_ROLE_CODE, isActive: true },
      select: { id: true },
    });
    if (adminRole === null) {
      throw new InitialAdminBootstrapError(
        `Missing approved active tenant administrative role: ${INITIAL_ADMIN_ROLE_CODE}`,
      );
    }

    if (!user.isActive) {
      throw new InitialAdminBootstrapError("Existing bootstrap administrator user is inactive");
    }
    if (user.displayName !== input.displayName) {
      await transaction.user.update({
        where: { id: user.id },
        data: { displayName: input.displayName },
      });
    }

    const membership = await transaction.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });
    if (membership === null || !membership.isActive) {
      throw new InitialAdminBootstrapError(
        "Existing bootstrap administrator tenant membership is missing or inactive",
      );
    }

    const existingAssignment = await transaction.membershipRole.findFirst({
      where: { tenantId, membershipId: membership.id, roleId: adminRole.id },
    });
    if (existingAssignment === null) {
      throw new InitialAdminBootstrapError(
        "Existing bootstrap administrator tenant membership is missing the expected tenant-admin role assignment",
      );
    }

    const credential = await transaction.passwordCredential.findUnique({
      where: { userId: user.id },
    });
    if (credential === null) {
      throw new InitialAdminBootstrapError(
        "Existing bootstrap administrator password credential is missing",
      );
    }

    const passwordHash = await hashPassword(input.password);
    await transaction.passwordCredential.update({
      where: { userId: user.id },
      data: {
        passwordHash,
        passwordUpdatedAt: new Date(),
        passwordVersion: credential.passwordVersion + 1,
      },
    });

    return {
      tenantName: INITIAL_ADMIN_TENANT_NAME,
      businessUnitName: INITIAL_ADMIN_BUSINESS_UNIT_NAME,
      roleCode: INITIAL_ADMIN_ROLE_CODE,
      userCreated: false,
      membershipCreated: false,
      roleAssignmentCreated: false,
      passwordCreated: false,
      passwordUpdated: true,
    };
  });
}
