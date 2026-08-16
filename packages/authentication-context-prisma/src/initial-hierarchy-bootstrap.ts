export const INITIAL_TENANT = {
  name: "HDK Beauty I Pvt. Ltd.",
  slug: "hdk-beauty-i-pvt-ltd",
} as const;

export const INITIAL_BUSINESS_UNIT = {
  name: "X Nail Bar",
  slug: "x-nail-bar",
} as const;

export const INITIAL_TENANT_ADMIN_ROLE = {
  code: "tenant-admin",
  name: "Tenant Admin",
} as const;

export const INITIAL_TENANT_ADMIN_PERMISSION_CODES = ["tenant.manage"] as const;

export class InitialHierarchyBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitialHierarchyBootstrapError";
  }
}

interface NamedRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
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

interface InitialHierarchyTransactionClient {
  readonly tenant: {
    findMany(args: {
      where: { OR: Array<{ name: string } | { slug: string }> };
      select: { id: true; name: true; slug: true; isActive: true };
    }): Promise<NamedRecord[]>;
    create(args: {
      data: { name: string; slug: string; isActive: true };
    }): Promise<NamedRecord>;
  };
  readonly businessUnit: {
    findMany(args: {
      where: {
        tenantId: string;
        OR: Array<{ name: string } | { slug: string }>;
      };
      select: { id: true; name: true; slug: true; isActive: true };
    }): Promise<NamedRecord[]>;
    create(args: {
      data: { tenantId: string; name: string; slug: string; isActive: true };
    }): Promise<NamedRecord>;
  };
  readonly role: {
    findMany(args: {
      where: {
        tenantId: string;
        OR: Array<{ code: string } | { name: string }>;
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
    create(args: {
      data: { tenantId: string; code: string; name: string; isActive: true };
      select: {
        id: true;
        code: true;
        name: true;
        isActive: true;
        permissions: {
          select: { permission: { select: { code: true } } };
        };
      };
    }): Promise<RoleRecord>;
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

export interface InitialHierarchyBootstrapPrismaClient {
  $transaction<T>(
    callback: (transaction: InitialHierarchyTransactionClient) => Promise<T>,
  ): Promise<T>;
}

export interface InitialHierarchyBootstrapResult {
  readonly tenantId: string;
  readonly businessUnitId: string;
  readonly roleId: string;
  readonly permissionCodes: readonly string[];
  readonly tenantCreated: boolean;
  readonly businessUnitCreated: boolean;
  readonly roleCreated: boolean;
  readonly permissionsCreated: number;
  readonly rolePermissionsCreated: number;
}

function assertNamedRecord(
  kind: string,
  records: readonly NamedRecord[],
  expected: { readonly name: string; readonly slug: string },
): NamedRecord | null {
  if (records.length > 1) {
    throw new InitialHierarchyBootstrapError(`Ambiguous initial ${kind} records`);
  }

  const record = records[0];
  if (record === undefined) {
    return null;
  }
  if (record.name !== expected.name || record.slug !== expected.slug || !record.isActive) {
    throw new InitialHierarchyBootstrapError(`Conflicting initial ${kind} record`);
  }
  return record;
}

function assertRole(records: readonly RoleRecord[]): RoleRecord | null {
  if (records.length > 1) {
    throw new InitialHierarchyBootstrapError("Ambiguous initial tenant administrator roles");
  }

  const role = records[0];
  if (role === undefined) {
    return null;
  }
  if (
    role.code !== INITIAL_TENANT_ADMIN_ROLE.code
    || role.name !== INITIAL_TENANT_ADMIN_ROLE.name
    || !role.isActive
  ) {
    throw new InitialHierarchyBootstrapError("Conflicting initial tenant administrator role");
  }

  const approvedCodes = new Set<string>(INITIAL_TENANT_ADMIN_PERMISSION_CODES);
  const unexpectedCode = role.permissions
    .map(({ permission }) => permission.code)
    .find((code) => !approvedCodes.has(code));
  if (unexpectedCode !== undefined) {
    throw new InitialHierarchyBootstrapError(
      `Initial tenant administrator role has unapproved permission: ${unexpectedCode}`,
    );
  }
  return role;
}

export async function bootstrapInitialHierarchy(
  prisma: InitialHierarchyBootstrapPrismaClient,
): Promise<InitialHierarchyBootstrapResult> {
  return prisma.$transaction(async (transaction) => {
    const tenantMatches = await transaction.tenant.findMany({
      where: { OR: [{ name: INITIAL_TENANT.name }, { slug: INITIAL_TENANT.slug }] },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    let tenant = assertNamedRecord("tenant", tenantMatches, INITIAL_TENANT);
    const tenantCreated = tenant === null;
    tenant ??= await transaction.tenant.create({
      data: { ...INITIAL_TENANT, isActive: true },
    });

    const businessUnitMatches = await transaction.businessUnit.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { name: INITIAL_BUSINESS_UNIT.name },
          { slug: INITIAL_BUSINESS_UNIT.slug },
        ],
      },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    let businessUnit = assertNamedRecord(
      "business unit",
      businessUnitMatches,
      INITIAL_BUSINESS_UNIT,
    );
    const businessUnitCreated = businessUnit === null;
    businessUnit ??= await transaction.businessUnit.create({
      data: { tenantId: tenant.id, ...INITIAL_BUSINESS_UNIT, isActive: true },
    });

    const roleMatches = await transaction.role.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { code: INITIAL_TENANT_ADMIN_ROLE.code },
          { name: INITIAL_TENANT_ADMIN_ROLE.name },
        ],
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
    let role = assertRole(roleMatches);
    const roleCreated = role === null;
    role ??= await transaction.role.create({
      data: { tenantId: tenant.id, ...INITIAL_TENANT_ADMIN_ROLE, isActive: true },
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

    const assignedCodes = new Set(
      role.permissions.map(({ permission }) => permission.code),
    );
    let permissionsCreated = 0;
    let rolePermissionsCreated = 0;
    for (const code of INITIAL_TENANT_ADMIN_PERMISSION_CODES) {
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
      businessUnitId: businessUnit.id,
      roleId: role.id,
      permissionCodes: INITIAL_TENANT_ADMIN_PERMISSION_CODES,
      tenantCreated,
      businessUnitCreated,
      roleCreated,
      permissionsCreated,
      rolePermissionsCreated,
    };
  });
}

export function formatInitialHierarchyBootstrapResult(
  result: InitialHierarchyBootstrapResult,
): string {
  return JSON.stringify({ status: "completed", ...result });
}

export function formatInitialHierarchyBootstrapError(error: unknown): string {
  return error instanceof InitialHierarchyBootstrapError
    ? error.message
    : "Initial hierarchy bootstrap failed";
}