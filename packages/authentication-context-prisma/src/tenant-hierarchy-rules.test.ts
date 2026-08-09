import { describe, expect, it } from "vitest";
import {
  evaluateBusinessUnitInTenant,
  evaluateBranchInBusinessUnit,
} from "./tenant-hierarchy-rules";
import type {
  TenantRecord,
  BusinessUnitRecord,
  BranchRecord,
} from "./tenant-hierarchy-rules";

const tenantId = "tenant-1";
const otherTenantId = "tenant-2";
const businessUnitId = "bu-1";
const otherBusinessUnitId = "bu-2";
const branchId = "branch-1";

const activeTenant: TenantRecord = { id: tenantId, isActive: true };
const inactiveTenant: TenantRecord = { id: tenantId, isActive: false };

const activeBusinessUnit: BusinessUnitRecord = {
  id: businessUnitId,
  tenantId,
  isActive: true,
};
const inactiveBusinessUnit: BusinessUnitRecord = {
  id: businessUnitId,
  tenantId,
  isActive: false,
};
const crossTenantBusinessUnit: BusinessUnitRecord = {
  id: businessUnitId,
  tenantId: otherTenantId,
  isActive: true,
};

const activeBranch: BranchRecord = {
  id: branchId,
  tenantId,
  businessUnitId,
  isActive: true,
};
const inactiveBranch: BranchRecord = {
  id: branchId,
  tenantId,
  businessUnitId,
  isActive: false,
};
const crossTenantBranch: BranchRecord = {
  id: branchId,
  tenantId: otherTenantId,
  businessUnitId,
  isActive: true,
};
const wrongBusinessUnitBranch: BranchRecord = {
  id: branchId,
  tenantId,
  businessUnitId: otherBusinessUnitId,
  isActive: true,
};

describe("evaluateBusinessUnitInTenant", () => {
  it("returns true for a valid, active business unit within an active tenant", () => {
    expect(
      evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        activeTenant,
        activeBusinessUnit,
      ),
    ).toBe(true);
  });

  it("returns false when the tenant is missing", () => {
    expect(
      evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        null,
        activeBusinessUnit,
      ),
    ).toBe(false);
  });

  it("returns false when the tenant is inactive", () => {
    expect(
      evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        inactiveTenant,
        activeBusinessUnit,
      ),
    ).toBe(false);
  });

  it("returns false when the business unit is missing", () => {
    expect(
      evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        activeTenant,
        null,
      ),
    ).toBe(false);
  });

  it("returns false when the business unit is inactive", () => {
    expect(
      evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        activeTenant,
        inactiveBusinessUnit,
      ),
    ).toBe(false);
  });

  it("returns false for a cross-tenant business unit (belongs to another tenant)", () => {
    expect(
      evaluateBusinessUnitInTenant(
        tenantId,
        businessUnitId,
        activeTenant,
        crossTenantBusinessUnit,
      ),
    ).toBe(false);
  });
});

describe("evaluateBranchInBusinessUnit", () => {
  it("returns true for a valid, active branch within a valid business unit", () => {
    expect(
      evaluateBranchInBusinessUnit(
        tenantId,
        businessUnitId,
        branchId,
        true,
        activeBranch,
      ),
    ).toBe(true);
  });

  it("returns false when the business unit itself is invalid", () => {
    expect(
      evaluateBranchInBusinessUnit(
        tenantId,
        businessUnitId,
        branchId,
        false,
        activeBranch,
      ),
    ).toBe(false);
  });

  it("returns false when the branch is missing", () => {
    expect(
      evaluateBranchInBusinessUnit(
        tenantId,
        businessUnitId,
        branchId,
        true,
        null,
      ),
    ).toBe(false);
  });

  it("returns false when the branch is inactive", () => {
    expect(
      evaluateBranchInBusinessUnit(
        tenantId,
        businessUnitId,
        branchId,
        true,
        inactiveBranch,
      ),
    ).toBe(false);
  });

  it("returns false for a cross-tenant branch (belongs to another tenant)", () => {
    expect(
      evaluateBranchInBusinessUnit(
        tenantId,
        businessUnitId,
        branchId,
        true,
        crossTenantBranch,
      ),
    ).toBe(false);
  });

  it("returns false for a branch that belongs to a different business unit", () => {
    expect(
      evaluateBranchInBusinessUnit(
        tenantId,
        businessUnitId,
        branchId,
        true,
        wrongBusinessUnitBranch,
      ),
    ).toBe(false);
  });
});
