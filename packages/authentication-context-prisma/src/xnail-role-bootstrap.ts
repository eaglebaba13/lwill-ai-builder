export const SCOPE_TYPES = ["TENANT", "BUSINESS_UNIT", "BRANCH", "TERRITORY"] as const;
export type ScopeType = typeof SCOPE_TYPES[number];

interface RoleCatalogueEntry {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly scopeType: ScopeType;
  readonly requiresScope: boolean;
  readonly permissions: readonly string[];
}

export const X_NAIL_ROLE_CATALOGUE: readonly RoleCatalogueEntry[] = [
  {
    code: "admin",
    name: "Admin",
    description: "Full tenant administrator with all permissions",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "tenant.manage",
      "customer.read", "customer.write",
      "appointment.read", "appointment.write",
      "attendance.read", "attendance.write",
      "branch.read", "branch.write",
      "business-unit.read", "business-unit.write",
      "franchise.read", "franchise.write",
      "invoice.read", "invoice.write",
      "membership.read", "membership.write",
      "notification.read", "notification.write",
      "package.read", "package.write",
      "product.read", "product.write",
      "purchaseReceipt.read", "purchaseReceipt.write",
      "reorderRule.read", "reorderRule.write",
      "report.read",
      "service.read", "service.write",
      "setting.read", "setting.write",
      "staff.read", "staff.write",
      "stockAdjustment.read", "stockAdjustment.write",
      "stockTransfer.read", "stockTransfer.write",
      "supplier.read", "supplier.write",
      "warehouse.read", "warehouse.write",
      "ai.project.read", "ai.project.write",
      "settlement.view", "settlement.generate", "settlement.approve",
    ],
  },
  {
    code: "owner",
    name: "Owner",
    description: "Business owner with full operational visibility",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "tenant.manage",
      "customer.read", "customer.write",
      "appointment.read", "appointment.write",
      "attendance.read", "attendance.write",
      "branch.read", "branch.write",
      "business-unit.read", "business-unit.write",
      "franchise.read", "franchise.write",
      "invoice.read", "invoice.write",
      "membership.read", "membership.write",
      "notification.read", "notification.write",
      "package.read", "package.write",
      "product.read", "product.write",
      "purchaseReceipt.read", "purchaseReceipt.write",
      "report.read",
      "service.read", "service.write",
      "setting.read", "setting.write",
      "staff.read", "staff.write",
      "stockAdjustment.read", "stockAdjustment.write",
      "stockTransfer.read", "stockTransfer.write",
      "supplier.read", "supplier.write",
      "warehouse.read", "warehouse.write",
      "settlement.view", "settlement.generate", "settlement.approve",
    ],
  },
  {
    code: "accountant",
    name: "Accountant",
    description: "Financial management and reporting",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "customer.read",
      "invoice.read", "invoice.write",
      "membership.read",
      "report.read",
      "settlement.view", "settlement.generate",
    ],
  },
  {
    code: "sales",
    name: "Sales",
    description: "Sales operations and customer management",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "customer.read", "customer.write",
      "appointment.read", "appointment.write",
      "invoice.read", "invoice.write",
      "membership.read", "membership.write",
      "package.read",
      "service.read",
      "report.read",
    ],
  },
  {
    code: "marketing",
    name: "Marketing",
    description: "Marketing campaigns and customer engagement",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "customer.read", "customer.write",
      "notification.read", "notification.write",
      "membership.read",
      "report.read",
    ],
  },
  {
    code: "hr",
    name: "HR",
    description: "Human resources and staff management",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "staff.read", "staff.write",
      "attendance.read", "attendance.write",
      "branch.read",
      "report.read",
    ],
  },
  {
    code: "inventory",
    name: "Inventory",
    description: "Inventory, stock, purchasing, and warehouse management",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "product.read", "product.write",
      "stockAdjustment.read", "stockAdjustment.write",
      "stockTransfer.read", "stockTransfer.write",
      "purchaseReceipt.read", "purchaseReceipt.write",
      "warehouse.read", "warehouse.write",
      "supplier.read", "supplier.write",
      "reorderRule.read", "reorderRule.write",
    ],
  },
  {
    code: "trainer",
    name: "Trainer",
    description: "Staff training and service oversight",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "staff.read",
      "attendance.read",
      "service.read",
    ],
  },
  {
    code: "state-franchise",
    name: "State Franchise",
    description: "State-level franchise operations",
    scopeType: "TERRITORY",
    requiresScope: true,
    permissions: [
      "franchise.read", "franchise.write",
      "customer.read",
      "invoice.read",
      "report.read",
      "settlement.view",
    ],
  },
  {
    code: "city-franchise",
    name: "City Franchise",
    description: "City/business-unit level franchise operations",
    scopeType: "BUSINESS_UNIT",
    requiresScope: true,
    permissions: [
      "franchise.read", "franchise.write",
      "customer.read",
      "invoice.read",
      "report.read",
      "settlement.view",
    ],
  },
  {
    code: "master-franchise",
    name: "Master Franchise",
    description: "Master franchise territory operations",
    scopeType: "TERRITORY",
    requiresScope: true,
    permissions: [
      "franchise.read", "franchise.write",
      "customer.read",
      "invoice.read",
      "report.read",
      "settlement.view",
    ],
  },
  {
    code: "branch-manager",
    name: "Branch Manager",
    description: "Branch-level operations management",
    scopeType: "BRANCH",
    requiresScope: true,
    permissions: [
      "appointment.read", "appointment.write",
      "customer.read", "customer.write",
      "staff.read", "staff.write",
      "attendance.read", "attendance.write",
      "invoice.read", "invoice.write",
      "product.read",
      "report.read",
      "service.read",
      "package.read",
      "membership.read",
      "settlement.view",
    ],
  },
  {
    code: "receptionist",
    name: "Receptionist",
    description: "Front desk and customer service",
    scopeType: "BRANCH",
    requiresScope: true,
    permissions: [
      "appointment.read", "appointment.write",
      "customer.read", "customer.write",
      "invoice.read", "invoice.write",
      "membership.read",
      "service.read",
      "package.read",
    ],
  },
  {
    code: "nail-technician",
    name: "Nail Technician",
    description: "Service delivery technician",
    scopeType: "BRANCH",
    requiresScope: true,
    permissions: [
      "appointment.read",
      "customer.read",
      "service.read",
    ],
  },
  {
    code: "customer",
    name: "Customer",
    description: "Customer self-service access",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "appointment.read",
      "service.read",
      "package.read",
      "membership.read",
    ],
  },
  {
    code: "auditor",
    name: "Auditor",
    description: "Read-only cross-module audit access",
    scopeType: "TENANT",
    requiresScope: false,
    permissions: [
      "customer.read",
      "appointment.read",
      "attendance.read",
      "branch.read",
      "business-unit.read",
      "franchise.read",
      "invoice.read",
      "membership.read",
      "notification.read",
      "package.read",
      "product.read",
      "purchaseReceipt.read",
      "reorderRule.read",
      "report.read",
      "service.read",
      "setting.read",
      "staff.read",
      "stockAdjustment.read",
      "stockTransfer.read",
      "supplier.read",
      "warehouse.read",
    ],
  },
];

export type XnailRoleCode = typeof X_NAIL_ROLE_CATALOGUE[number]["code"];

const ROLE_SCOPE_MAP: ReadonlyMap<string, RoleCatalogueEntry> = new Map(
  X_NAIL_ROLE_CATALOGUE.map((r) => [r.code, r]),
);

export function getRoleScopeMetadata(code: string): { scopeType: ScopeType; requiresScope: boolean } | undefined {
  const entry = ROLE_SCOPE_MAP.get(code);
  if (entry === undefined) return undefined;
  return { scopeType: entry.scopeType, requiresScope: entry.requiresScope };
}

export interface XnailRoleBootstrapResult {
  readonly tenantId: string;
  readonly rolesCreated: number;
  readonly rolesUpdated: number;
  readonly permissionsCreated: number;
  readonly rolePermissionsCreated: number;
}

export class XnailRoleBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XnailRoleBootstrapError";
  }
}

interface RoleBootstrapTransactionClient {
  readonly tenant: {
    findMany(args: { where: { name: string; isActive: true }; select: { id: true } }): Promise<Array<{ id: string }>>;
  };
  readonly role: {
    findMany(args: { where: { tenantId: string; isActive: true }; select: { id: true; code: true } }): Promise<Array<{ id: string; code: string }>>;
    create(args: { data: { tenantId: string; code: string; name: string; description: string; isSystem: false; isActive: true } }): Promise<{ id: string }>;
  };
  readonly permission: {
    findUnique(args: { where: { code: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: { data: { code: string; description: string } }): Promise<{ id: string }>;
  };
  readonly rolePermission: {
    findFirst(args: { where: { tenantId: string; roleId: string; permissionId: string } }): Promise<{ id: string } | null>;
    create(args: { data: { tenantId: string; roleId: string; permissionId: string } }): Promise<unknown>;
  };
}

export interface XnailRoleBootstrapPrismaClient {
  $transaction<T>(callback: (transaction: RoleBootstrapTransactionClient) => Promise<T>): Promise<T>;
}

export function formatXnailRoleBootstrapResult(result: XnailRoleBootstrapResult): string {
  return JSON.stringify({
    status: "completed",
    tenantId: result.tenantId,
    rolesCreated: result.rolesCreated,
    permissionsCreated: result.permissionsCreated,
    rolePermissionsCreated: result.rolePermissionsCreated,
  });
}

export async function bootstrapXnailRoles(
  prisma: XnailRoleBootstrapPrismaClient,
  tenantName = "HDK Beauty I Pvt. Ltd.",
): Promise<XnailRoleBootstrapResult> {
  return prisma.$transaction(async (tx) => {
    const tenants = await tx.tenant.findMany({
      where: { name: tenantName, isActive: true },
      select: { id: true },
    });
    if (tenants.length !== 1) {
      throw new XnailRoleBootstrapError(
        `Expected exactly one active tenant named "${tenantName}", found ${tenants.length}`,
      );
    }
    const tenantId = tenants[0].id;

    const existingRoles = await tx.role.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true },
    });
    const existingRoleMap = new Map(existingRoles.map((r) => [r.code, r.id]));

    let rolesCreated = 0;
    let rolesUpdated = 0;
    let permissionsCreated = 0;
    let rolePermissionsCreated = 0;

    for (const roleDef of X_NAIL_ROLE_CATALOGUE) {
      let roleId = existingRoleMap.get(roleDef.code);

      if (roleId === undefined) {
        const newRole = await tx.role.create({
          data: {
            tenantId,
            code: roleDef.code,
            name: roleDef.name,
            description: roleDef.description,
            isSystem: false,
            isActive: true,
          },
        });
        roleId = newRole.id;
        rolesCreated++;
      }

      for (const permCode of roleDef.permissions) {
        let perm = await tx.permission.findUnique({
          where: { code: permCode },
          select: { id: true },
        });
        if (perm === null) {
          perm = await tx.permission.create({
            data: { code: permCode, description: permCode },
          });
          permissionsCreated++;
        }

        const existing = await tx.rolePermission.findFirst({
          where: { tenantId, roleId, permissionId: perm.id },
        });
        if (existing === null) {
          await tx.rolePermission.create({
            data: { tenantId, roleId, permissionId: perm.id },
          });
          rolePermissionsCreated++;
        }
      }
    }

    return {
      tenantId,
      rolesCreated,
      rolesUpdated,
      permissionsCreated,
      rolePermissionsCreated,
    };
  });
}
