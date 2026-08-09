/**
 * Provider-neutral interface for verifying tenant hierarchy membership.
 * Implementations connect to the database; this package remains I/O-free.
 */
export interface TenantHierarchyVerifier {
  isBusinessUnitInTenant(
    tenantId: string,
    businessUnitId: string,
  ): Promise<boolean>;
  isBranchInBusinessUnit(
    tenantId: string,
    businessUnitId: string,
    branchId: string,
  ): Promise<boolean>;
}

export type TenantContextValidationResult =
  | {
      readonly valid: true;
      readonly tenantId: string;
      readonly businessUnitId: string;
      readonly branchId: string;
    }
  | { readonly valid: false; readonly reason: string };

/**
 * Validates the full Tenant → BusinessUnit → Branch hierarchy.
 *
 * Rules:
 *   - Business unit must belong to the tenant.
 *   - Branch must belong to the business unit within the same tenant.
 *   - Any verifier failure fails closed (returns invalid).
 *
 * Never trusts client-supplied IDs directly; the caller must ensure
 * these values come from a validated, authenticated session context.
 */
export async function validateTenantContext(
  tenantId: string,
  businessUnitId: string,
  branchId: string,
  verifier: TenantHierarchyVerifier,
): Promise<TenantContextValidationResult> {
  try {
    const buValid = await verifier.isBusinessUnitInTenant(
      tenantId,
      businessUnitId,
    );
    if (!buValid) {
      return {
        valid: false,
        reason: "business unit does not belong to tenant",
      };
    }

    const branchValid = await verifier.isBranchInBusinessUnit(
      tenantId,
      businessUnitId,
      branchId,
    );
    if (!branchValid) {
      return {
        valid: false,
        reason: "branch does not belong to business unit",
      };
    }

    return { valid: true, tenantId, businessUnitId, branchId };
  } catch {
    return { valid: false, reason: "tenant hierarchy verification failed" };
  }
}
