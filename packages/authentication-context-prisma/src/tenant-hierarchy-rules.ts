/** Minimal Tenant fields required for hierarchy verification. */
export interface TenantRecord {
  readonly id: string;
  readonly isActive: boolean;
}

/** Minimal BusinessUnit fields required for hierarchy verification. */
export interface BusinessUnitRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly isActive: boolean;
}

/** Minimal Branch fields required for hierarchy verification. */
export interface BranchRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly businessUnitId: string;
  readonly isActive: boolean;
}

/**
 * Pure decision rule: a business unit belongs to a tenant only when both the
 * tenant and the business unit exist, are active, and the business unit's
 * parent tenant matches the requested tenant. Records from a different
 * tenant (cross-tenant) or that are missing/inactive fail closed (false).
 */
export function evaluateBusinessUnitInTenant(
  tenantId: string,
  businessUnitId: string,
  tenant: TenantRecord | null,
  businessUnit: BusinessUnitRecord | null,
): boolean {
  if (tenant === null || !tenant.isActive || tenant.id !== tenantId) {
    return false;
  }

  if (businessUnit === null || !businessUnit.isActive) {
    return false;
  }

  if (
    businessUnit.tenantId !== tenantId ||
    businessUnit.id !== businessUnitId
  ) {
    return false;
  }

  return true;
}

/**
 * Pure decision rule: a branch belongs to a business unit only when the
 * business unit itself is valid (see evaluateBusinessUnitInTenant), the
 * branch exists, is active, and its tenant/business-unit parents match the
 * requested scope exactly. Fails closed on any mismatch.
 */
export function evaluateBranchInBusinessUnit(
  tenantId: string,
  businessUnitId: string,
  branchId: string,
  businessUnitValid: boolean,
  branch: BranchRecord | null,
): boolean {
  if (!businessUnitValid) {
    return false;
  }

  if (branch === null || !branch.isActive) {
    return false;
  }

  if (
    branch.tenantId !== tenantId ||
    branch.businessUnitId !== businessUnitId ||
    branch.id !== branchId
  ) {
    return false;
  }

  return true;
}
