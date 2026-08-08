import type { PermissionGrant } from "@lwill/authorization/src/types";

export interface PermissionRecord {
  readonly code: string;
}

export interface RolePermissionRecord {
  readonly permission: PermissionRecord;
}

export interface RoleRecord {
  readonly isActive: boolean;
  readonly permissions: readonly RolePermissionRecord[];
}

export interface TenantRoleAssignment {
  readonly role: RoleRecord;
}

export interface BusinessUnitRoleAssignment {
  readonly businessUnitId: string;
  readonly role: RoleRecord;
}

export interface BranchRoleAssignment {
  readonly businessUnitId: string;
  readonly branchId: string;
  readonly role: RoleRecord;
}

export interface MembershipGrantSource {
  readonly isActive: boolean;
  readonly roles: readonly TenantRoleAssignment[];
  readonly businessUnitRoles: readonly BusinessUnitRoleAssignment[];
  readonly branchRoles: readonly BranchRoleAssignment[];
}

export function mapMembershipToPermissionGrants(
  tenantId: string,
  membership: MembershipGrantSource,
): readonly PermissionGrant[] {
  if (!membership.isActive) {
    return [];
  }

  const grants: PermissionGrant[] = [];

  for (const assignment of membership.roles) {
    if (!assignment.role.isActive) {
      continue;
    }

    for (const rolePermission of assignment.role.permissions) {
      grants.push({
        permissionCode: rolePermission.permission.code,
        scope: {
          kind: "tenant",
          tenantId,
        },
      });
    }
  }

  for (const assignment of membership.businessUnitRoles) {
    if (!assignment.role.isActive) {
      continue;
    }

    for (const rolePermission of assignment.role.permissions) {
      grants.push({
        permissionCode: rolePermission.permission.code,
        scope: {
          kind: "business-unit",
          tenantId,
          businessUnitId: assignment.businessUnitId,
        },
      });
    }
  }

  for (const assignment of membership.branchRoles) {
    if (!assignment.role.isActive) {
      continue;
    }

    for (const rolePermission of assignment.role.permissions) {
      grants.push({
        permissionCode: rolePermission.permission.code,
        scope: {
          kind: "branch",
          tenantId,
          businessUnitId: assignment.businessUnitId,
          branchId: assignment.branchId,
        },
      });
    }
  }

  return grants;
}
