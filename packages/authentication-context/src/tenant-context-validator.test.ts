import { describe, expect, it } from "vitest";
import { validateTenantContext } from "./tenant-context-validator";
import type { TenantHierarchyVerifier } from "./tenant-context-validator";

function makeVerifier(
  validBUs: Array<{ tenantId: string; businessUnitId: string }>,
  validBranches: Array<{
    tenantId: string;
    businessUnitId: string;
    branchId: string;
  }>,
): TenantHierarchyVerifier {
  return {
    async isBusinessUnitInTenant(tenantId, businessUnitId) {
      return validBUs.some(
        (bu) =>
          bu.tenantId === tenantId && bu.businessUnitId === businessUnitId,
      );
    },
    async isBranchInBusinessUnit(tenantId, businessUnitId, branchId) {
      return validBranches.some(
        (b) =>
          b.tenantId === tenantId &&
          b.businessUnitId === businessUnitId &&
          b.branchId === branchId,
      );
    },
  };
}

const tenantId = "tenant-1";
const otherTenantId = "tenant-2";
const businessUnitId = "bu-1";
const branchId = "branch-1";

const verifier = makeVerifier(
  [{ tenantId, businessUnitId }],
  [{ tenantId, businessUnitId, branchId }],
);

describe("validateTenantContext", () => {
  it("returns valid for a correct Tenant → BusinessUnit → Branch hierarchy", async () => {
    const result = await validateTenantContext(
      tenantId,
      businessUnitId,
      branchId,
      verifier,
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.tenantId).toBe(tenantId);
      expect(result.businessUnitId).toBe(businessUnitId);
      expect(result.branchId).toBe(branchId);
    }
  });

  it("rejects a business unit that does not belong to the tenant", async () => {
    const result = await validateTenantContext(
      tenantId,
      "bu-unknown",
      branchId,
      verifier,
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("business unit");
    }
  });

  it("rejects a branch that does not belong to the business unit", async () => {
    const result = await validateTenantContext(
      tenantId,
      businessUnitId,
      "branch-unknown",
      verifier,
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("branch");
    }
  });

  it("rejects a cross-tenant business unit (BU belongs to another tenant)", async () => {
    const result = await validateTenantContext(
      otherTenantId,
      businessUnitId,
      branchId,
      verifier,
    );

    expect(result.valid).toBe(false);
  });

  it("rejects a cross-tenant branch (branch is not in the requested tenant scope)", async () => {
    // tenant-2 has no BUs or branches registered in verifier
    const result = await validateTenantContext(
      otherTenantId,
      businessUnitId,
      branchId,
      verifier,
    );

    expect(result.valid).toBe(false);
  });

  it("rejects when branch belongs to a different business unit within the same tenant", async () => {
    // bu-2 exists in tenant but branch-1 is under bu-1, not bu-2
    const verifierWithTwoBUs = makeVerifier(
      [
        { tenantId, businessUnitId: "bu-1" },
        { tenantId, businessUnitId: "bu-2" },
      ],
      [{ tenantId, businessUnitId: "bu-1", branchId: "branch-1" }],
    );

    const result = await validateTenantContext(
      tenantId,
      "bu-2",
      "branch-1",
      verifierWithTwoBUs,
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("branch");
    }
  });

  it("fails closed when verifier throws an error", async () => {
    const throwingVerifier: TenantHierarchyVerifier = {
      async isBusinessUnitInTenant() {
        throw new Error("database unavailable");
      },
      async isBranchInBusinessUnit() {
        throw new Error("database unavailable");
      },
    };

    const result = await validateTenantContext(
      tenantId,
      businessUnitId,
      branchId,
      throwingVerifier,
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("tenant hierarchy verification failed");
    }
  });
});
