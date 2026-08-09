import { prisma } from "@lwill/database/client";
import type { TenantHierarchyVerifier } from "@lwill/authentication-context/src/tenant-context-validator";
import {
  evaluateBusinessUnitInTenant,
  evaluateBranchInBusinessUnit,
} from "./tenant-hierarchy-rules";

/**
 * Prisma-backed implementation of TenantHierarchyVerifier.
 *
 * Fetches raw Tenant/BusinessUnit/Branch records and delegates the actual
 * accept/reject decision to the pure, unit-tested rules in
 * tenant-hierarchy-rules.ts. Any database error fails closed (returns false).
 *
 * This is a thin I/O boundary and is intentionally not unit tested directly;
 * its decision logic is fully covered by tenant-hierarchy-rules.test.ts.
 */
export function createPrismaTenantHierarchyVerifier(): TenantHierarchyVerifier {
  return {
    async isBusinessUnitInTenant(tenantId, businessUnitId) {
      try {
        const [tenant, businessUnit] = await Promise.all([
          prisma.tenant.findUnique({ where: { id: tenantId } }),
          prisma.businessUnit.findUnique({
            where: { tenantId_id: { tenantId, id: businessUnitId } },
          }),
        ]);

        return evaluateBusinessUnitInTenant(
          tenantId,
          businessUnitId,
          tenant,
          businessUnit,
        );
      } catch {
        return false;
      }
    },

    async isBranchInBusinessUnit(tenantId, businessUnitId, branchId) {
      try {
        const [tenant, businessUnit, branch] = await Promise.all([
          prisma.tenant.findUnique({ where: { id: tenantId } }),
          prisma.businessUnit.findUnique({
            where: { tenantId_id: { tenantId, id: businessUnitId } },
          }),
          prisma.branch.findUnique({
            where: {
              tenantId_businessUnitId_id: {
                tenantId,
                businessUnitId,
                id: branchId,
              },
            },
          }),
        ]);

        const businessUnitValid = evaluateBusinessUnitInTenant(
          tenantId,
          businessUnitId,
          tenant,
          businessUnit,
        );

        return evaluateBranchInBusinessUnit(
          tenantId,
          businessUnitId,
          branchId,
          businessUnitValid,
          branch,
        );
      } catch {
        return false;
      }
    },
  };
}
