export const BUSINESS_UNIT_PERMISSION_CODES = ["business-unit.read", "business-unit.write"] as const;

export const TARGET_ROLE = {
  code: "tenant-admin",
  name: "Tenant Admin",
} as const;

export class BusinessUnitPermissionsBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessUnitPermissionsBootstrapError";
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

interface BusinessUnitPermissionsTransactionClient {
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

export interface BusinessUnitPermissionsBootstrapPrismaClient {
  $transaction<T>(
    callback: (transaction: BusinessUnitPermissionsTransactionClient) => Promise<T>,
  ): Promise<T>;
}

export interface BusinessUnitPermissionsBootstrapResult {
  readonly tenantId: string;
  readonly roleId: string;
  readonly permissionCodes: readonly string[];
  readonly permissionsCreated: number;
  readonly rolePermissionsCreated: number;
}

export async function bootstrapBusinessUnitPermissions(
  prisma: BusinessUnitPermissionsBootstrapPrismaClient,
): Promise<BusinessUnitPermissionsBootstrapResult> {
  return prisma.$transaction(async (transaction) => {
    const tenantMatches = await transaction.tenant.findMany({
      where: { name: "HDK Beauty I Pvt. Ltd." },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    if (tenantMatches.length === 0) {
      throw new BusinessUnitPermissionsBootstrapError(
        "Target tenant not found; run the initial hierarchy bootstrap first",
      );
    }
    if (tenantMatches.length > 1) {
      throw new BusinessUnitPermissionsBootstrapError("Ambiguous target tenant records");
    }
    const tenant = tenantMatches[0]!;
    if (!tenant.isActive) {
      throw new BusinessUnitPermissionsBootstrapError("Target tenant is inactive");
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
      throw new BusinessUnitPermissionsBootstrapError(
        "Target role not found; run the initial hierarchy bootstrap first",
      );
    }
    if (roleMatches.length > 1) {
      throw new BusinessUnitPermissionsBootstrapError("Ambiguous target role records");
    }
    const role = roleMatches[0]!;
    if (
      role.code !== TARGET_ROLE.code
      || role.name !== TARGET_ROLE.name
      || !role.isActive
    ) {
      throw new BusinessUnitPermissionsBootstrapError("Conflicting target role record");
    }

    const assignedCodes = new Set(
      role.permissions.map(({ permission }) => permission.code),
    );
    let permissionsCreated = 0;
    let rolePermissionsCreated = 0;
    for (const code of BUSINESS_UNIT_PERMISSION_CODES) {
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
      permissionCodes: BUSINESS_UNIT_PERMISSION_CODES,
      permissionsCreated,
      rolePermissionsCreated,
    };
  });
}

export function formatBusinessUnitPermissionsBootstrapResult(
  result: BusinessUnitPermissionsBootstrapResult,
): string {
  return JSON.stringify({ status: "completed", ...result });
}

export function formatBusinessUnitPermissionsBootstrapError(error: unknown): string {
  return error instanceof BusinessUnitPermissionsBootstrapError
    ? error.message
    : "Business unit permissions bootstrap failed";
}
