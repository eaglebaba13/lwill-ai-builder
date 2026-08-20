export const SERVICE_PERMISSION_CODES = ["service.read", "service.write"] as const;

export const TARGET_ROLE = {
  code: "tenant-admin",
  name: "Tenant Admin",
} as const;

export class ServicePermissionsBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServicePermissionsBootstrapError";
  }
}

interface RoleRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly permissions: ReadonlyArray<{
    readonly permission: { readonly code: string };
  }>;
}

interface ServicePermissionsTransactionClient {
  readonly tenant: {
    findMany(args: {
      where: { name: string };
      select: { id: true; name: true; slug: true; isActive: true };
    }): Promise<ReadonlyArray<{ readonly id: string; readonly name: string; readonly slug: string; readonly isActive: boolean }>>;
  };
  readonly role: {
    findMany(args: {
      where: {
        tenantId: string;
        code: string;
      };
      select: {
        id: true;
        code: true;
        name: true;
        isActive: true;
        permissions: {
          select: { permission: { select: { code: true } } };
        };
      };
    }): Promise<RoleRecord[]>;
  };
  readonly permission: {
    findUnique(args: {
      where: { code: string };
      select: { id: true; code: true };
    }): Promise<{ id: string; code: string } | null>;
    create(args: {
      data: { code: string };
    }): Promise<{ id: string; code: string }>;
  };
  readonly rolePermission: {
    create(args: {
      data: { tenantId: string; roleId: string; permissionId: string };
    }): Promise<unknown>;
  };
}

export interface ServicePermissionsBootstrapPrismaClient {
  $transaction<T>(
    callback: (transaction: ServicePermissionsTransactionClient) => Promise<T>,
  ): Promise<T>;
}

export interface ServicePermissionsBootstrapResult {
  readonly tenantId: string;
  readonly roleId: string;
  readonly permissionCodes: readonly string[];
  readonly permissionsCreated: number;
  readonly rolePermissionsCreated: number;
}

export async function bootstrapServicePermissions(
  prisma: ServicePermissionsBootstrapPrismaClient,
): Promise<ServicePermissionsBootstrapResult> {
  return prisma.$transaction(async (transaction) => {
    const tenantMatches = await transaction.tenant.findMany({
      where: { name: "HDK Beauty I Pvt. Ltd." },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    if (tenantMatches.length === 0) {
      throw new ServicePermissionsBootstrapError(
        "Target tenant not found; run the initial hierarchy bootstrap first",
      );
    }
    if (tenantMatches.length > 1) {
      throw new ServicePermissionsBootstrapError("Ambiguous target tenant records");
    }
    const tenant = tenantMatches[0]!;
    if (!tenant.isActive) {
      throw new ServicePermissionsBootstrapError("Target tenant is inactive");
    }

    const roleMatches = await transaction.role.findMany({
      where: {
        tenantId: tenant.id,
        code: TARGET_ROLE.code,
      },
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
    if (roleMatches.length === 0) {
      throw new ServicePermissionsBootstrapError(
        "Target role not found; run the initial hierarchy bootstrap first",
      );
    }
    if (roleMatches.length > 1) {
      throw new ServicePermissionsBootstrapError("Ambiguous target role records");
    }
    const role = roleMatches[0]!;
    if (
      role.code !== TARGET_ROLE.code
      || role.name !== TARGET_ROLE.name
      || !role.isActive
    ) {
      throw new ServicePermissionsBootstrapError("Conflicting target role record");
    }

    const assignedCodes = new Set(
      role.permissions.map(({ permission }) => permission.code),
    );
    let permissionsCreated = 0;
    let rolePermissionsCreated = 0;
    for (const code of SERVICE_PERMISSION_CODES) {
      let permission = await transaction.permission.findUnique({
        where: { code },
        select: { id: true, code: true },
      });
      if (permission === null) {
        permission = await transaction.permission.create({ data: { code } });
        permissionsCreated += 1;
      }
      if (!assignedCodes.has(code)) {
        await transaction.rolePermission.create({
          data: {
            tenantId: tenant.id,
            roleId: role.id,
            permissionId: permission.id,
          },
        });
        rolePermissionsCreated += 1;
      }
    }

    return {
      tenantId: tenant.id,
      roleId: role.id,
      permissionCodes: SERVICE_PERMISSION_CODES,
      permissionsCreated,
      rolePermissionsCreated,
    };
  });
}

export function formatServicePermissionsBootstrapResult(
  result: ServicePermissionsBootstrapResult,
): string {
  return JSON.stringify({ status: "completed", ...result });
}

export function formatServicePermissionsBootstrapError(error: unknown): string {
  return error instanceof ServicePermissionsBootstrapError
    ? error.message
    : "Service permissions bootstrap failed";
}
