import { describe, expect, it } from "vitest";
import { validateTenantContext } from "@lwill/authentication-context/src/tenant-context-validator";
import type { TenantHierarchyVerifier } from "@lwill/authentication-context/src/tenant-context-validator";
import {
  evaluateBusinessUnitInTenant,
  evaluateBranchInBusinessUnit,
} from "./tenant-hierarchy-rules";
import type {
  TenantRecord,
  BusinessUnitRecord,
  BranchRecord,
} from "./tenant-hierarchy-rules";

/**
 * In-memory fixture standing in for the Prisma-backed data source. Proves the
 * wiring between validateTenantContext (from @lwill/authentication-context)
 * and the Prisma-shaped rules in this package, without requiring a live
 * PostgreSQL instance.
 */
function createFixtureVerifier(
  tenants: readonly TenantRecord[],
  businessUnits: readonly BusinessUnitRecord[],
  branches: readonly BranchRecord[],
): TenantHierarchyVerifier {
  return {
    async isBusinessUnitInTenant(tenantId, businessUnitId) {
      const tenant = tenants.find((t) => t.id === tenantId) ?? null;
      const businessUnit =
        businessUnits.find((bu) => bu.id === businessUnitId) ?? null;
      return evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        tenant,
        businessUnit,
      );
    },
    async isBranchInBusinessUnit(tenantId, businessUnitId, branchId) {
      const tenant = tenants.find((t) => t.id === tenantId) ?? null;
      const businessUnit =
        businessUnits.find((bu) => bu.id === businessUnitId) ?? null;
      const businessUnitValid = evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        tenant,
        businessUnit,
      );
      const branch = branches.find((b) => b.id === branchId) ?? null;
      return evaluateBranchInBusinessUnit(
        tenantId,
        businessUnitId,
        branchId,
        businessUnitValid,
        branch,
      );
    },
  };
}

const tenantId = "tenant-1";
const otherTenantId = "tenant-2";
const businessUnitId = "bu-1";
const branchId = "branch-1";

const verifier = createFixtureVerifier(
  [{ id: tenantId, isActive: true }],
  [{ id: businessUnitId, tenantId, isActive: true }],
  [{ id: branchId, tenantId, businessUnitId, isActive: true }],
);

describe("validateTenantContext wired to Prisma-shaped hierarchy rules", () => {
  it("accepts a fully valid Tenant -> BusinessUnit -> Branch chain", async () => {
    const result = await validateTenantContext(
      tenantId,
      businessUnitId,
      branchId,
      verifier,
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a cross-tenant business unit even when validated end-to-end", async () => {
    const result = await validateTenantContext(
      otherTenantId,
      businessUnitId,
      branchId,
      verifier,
    );
    expect(result.valid).toBe(false);
  });

  it("rejects an unknown tenant end-to-end", async () => {
    const result = await validateTenantContext(
      "tenant-unknown",
      businessUnitId,
      branchId,
      verifier,
    );
    expect(result.valid).toBe(false);
  });
});
