export const PLATFORM_OWNER_ROLE = {
  code: "platform-owner",
  name: "Platform Owner",
} as const;

export const PLATFORM_PERMISSION_CODES = ["platform.manage"] as const;

export class PlatformAdminBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformAdminBootstrapError";
  }
}

interface PlatformAdminTransactionClient {
  readonly permission: {
    findUnique(args: {
      where: { code: string };
      select: { id: true; code: true };
    }): Promise<{ id: string; code: string } | null>;
    create(args: {
      data: { code: string };
    }): Promise<{ id: string; code: string }>;
  };
  readonly platformRole: {
    findUnique(args: {
      where: { code: string };
      select: {
        id: true;
        code: true;
        name: true;
        isActive: true;
        permissions: {
          select: { permission: { select: { code: true } } };
        };
      };
    }): Promise<{
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      permissions: ReadonlyArray<{
        readonly permission: { readonly code: string };
      }>;
    } | null>;
    create(args: {
      data: { code: string; name: string; isActive: true };
    }): Promise<{ id: string; code: string; name: string }>;
  };
  readonly platformRolePermission: {
    create(args: {
      data: { roleId: string; permissionId: string };
    }): Promise<unknown>;
  };
  readonly user: {
    findUnique(args: {
      where: { email: string };
      select: { id: true; email: true; isActive: true };
    }): Promise<{ id: string; email: string; isActive: boolean } | null>;
  };
  readonly platformUserRole: {
    findFirst(args: {
      where: { userId: string; roleId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: { userId: string; roleId: string };
    }): Promise<unknown>;
  };
}

export interface PlatformAdminBootstrapPrismaClient {
  $transaction<T>(
    callback: (transaction: PlatformAdminTransactionClient) => Promise<T>,
  ): Promise<T>;
}

export interface PlatformAdminBootstrapInput {
  readonly ownerEmail: string;
}

export interface PlatformAdminBootstrapResult {
  readonly roleId: string;
  readonly roleCode: string;
  readonly permissionCodes: readonly string[];
  readonly permissionsCreated: number;
  readonly rolePermissionsCreated: number;
  readonly userId: string | null;
  readonly userRoleCreated: boolean;
}

export async function bootstrapPlatformAdmin(
  prisma: PlatformAdminBootstrapPrismaClient,
  input: PlatformAdminBootstrapInput,
): Promise<PlatformAdminBootstrapResult> {
  return prisma.$transaction(async (transaction) => {
    // Create platform.manage permission if missing
    let permissionsCreated = 0;
    const permissionIds: string[] = [];
    for (const code of PLATFORM_PERMISSION_CODES) {
      let permission = await transaction.permission.findUnique({
        where: { code },
        select: { id: true, code: true },
      });
      if (permission === null) {
        permission = await transaction.permission.create({ data: { code } });
        permissionsCreated += 1;
      }
      permissionIds.push(permission.id);
    }

    // Create platform-owner role if missing
    let role = await transaction.platformRole.findUnique({
      where: { code: PLATFORM_OWNER_ROLE.code },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        permissions: {
          select: { permission: { select: { code: true } } },
        },
      },
    });
    if (role === null) {
      role = await transaction.platformRole.create({
        data: {
          code: PLATFORM_OWNER_ROLE.code,
          name: PLATFORM_OWNER_ROLE.name,
          isActive: true,
        },
      });
    }

    // Assign permissions to role
    const assignedCodes = new Set(
      (role.permissions ?? []).map(({ permission }) => permission.code),
    );
    let rolePermissionsCreated = 0;
    for (let i = 0; i < PLATFORM_PERMISSION_CODES.length; i++) {
      const code = PLATFORM_PERMISSION_CODES[i]!;
      if (!assignedCodes.has(code)) {
        await transaction.platformRolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permissionIds[i]!,
          },
        });
        rolePermissionsCreated += 1;
      }
    }

    // Assign role to user
    let userId: string | null = null;
    let userRoleCreated = false;
    const user = await transaction.user.findUnique({
      where: { email: input.ownerEmail },
      select: { id: true, email: true, isActive: true },
    });
    if (user !== null && user.isActive) {
      userId = user.id;
      const existing = await transaction.platformUserRole.findFirst({
        where: { userId: user.id, roleId: role.id },
        select: { id: true },
      });
      if (existing === null) {
        await transaction.platformUserRole.create({
          data: { userId: user.id, roleId: role.id },
        });
        userRoleCreated = true;
      }
    }

    return {
      roleId: role.id,
      roleCode: role.code,
      permissionCodes: PLATFORM_PERMISSION_CODES,
      permissionsCreated,
      rolePermissionsCreated,
      userId,
      userRoleCreated,
    };
  });
}

export function formatPlatformAdminBootstrapResult(
  result: PlatformAdminBootstrapResult,
): string {
  return JSON.stringify({ status: "completed", ...result });
}

export function formatPlatformAdminBootstrapError(error: unknown): string {
  return error instanceof PlatformAdminBootstrapError
    ? error.message
    : "Platform admin bootstrap failed";
}
