import { describe, expect, it } from "vitest";
import { authorize } from "./authorize";
import type { PermissionGrant } from "./types";

describe("authorize", () => {
  const tenantGrant: PermissionGrant = {
    permissionCode: "customer.read",
    scope: {
      kind: "tenant",
      tenantId: "tenant-a",
    },
  };

  const businessUnitGrant: PermissionGrant = {
    permissionCode: "customer.read",
    scope: {
      kind: "business-unit",
      tenantId: "tenant-a",
      businessUnitId: "bu-a",
    },
  };

  const branchGrant: PermissionGrant = {
    permissionCode: "customer.read",
    scope: {
      kind: "branch",
      tenantId: "tenant-a",
      businessUnitId: "bu-a",
      branchId: "branch-a",
    },
  };

  it("allows a tenant grant at tenant scope", () => {
    expect(
      authorize(
        {
          permissionCode: "customer.read",
          scope: { kind: "tenant", tenantId: "tenant-a" },
        },
        [tenantGrant],
      ).allowed,
    ).toBe(true);
  });

  it("allows a tenant grant at business-unit and branch scope", () => {
    expect(
      authorize(
        {
          permissionCode: "customer.read",
          scope: {
            kind: "branch",
            tenantId: "tenant-a",
            businessUnitId: "bu-a",
            branchId: "branch-a",
          },
        },
        [tenantGrant],
      ).allowed,
    ).toBe(true);
  });

  it("allows a business-unit grant within the same business unit", () => {
    expect(
      authorize(
        {
          permissionCode: "customer.read",
          scope: {
            kind: "branch",
            tenantId: "tenant-a",
            businessUnitId: "bu-a",
            branchId: "branch-b",
          },
        },
        [businessUnitGrant],
      ).allowed,
    ).toBe(true);
  });

  it("does not allow a business-unit grant at tenant scope", () => {
    expect(
      authorize(
        {
          permissionCode: "customer.read",
          scope: { kind: "tenant", tenantId: "tenant-a" },
        },
        [businessUnitGrant],
      ).allowed,
    ).toBe(false);
  });

  it("allows a branch grant only for the exact branch", () => {
    expect(
      authorize(
        {
          permissionCode: "customer.read",
          scope: {
            kind: "branch",
            tenantId: "tenant-a",
            businessUnitId: "bu-a",
            branchId: "branch-a",
          },
        },
        [branchGrant],
      ).allowed,
    ).toBe(true);

    expect(
      authorize(
        {
          permissionCode: "customer.read",
          scope: {
            kind: "branch",
            tenantId: "tenant-a",
            businessUnitId: "bu-a",
            branchId: "branch-b",
          },
        },
        [branchGrant],
      ).allowed,
    ).toBe(false);
  });

  it("denies cross-tenant access", () => {
    expect(
      authorize(
        {
          permissionCode: "customer.read",
          scope: {
            kind: "branch",
            tenantId: "tenant-b",
            businessUnitId: "bu-a",
            branchId: "branch-a",
          },
        },
        [tenantGrant, businessUnitGrant, branchGrant],
      ).allowed,
    ).toBe(false);
  });

  it("denies when the permission code does not match", () => {
    expect(
      authorize(
        {
          permissionCode: "customer.write",
          scope: { kind: "tenant", tenantId: "tenant-a" },
        },
        [tenantGrant],
      ).allowed,
    ).toBe(false);
  });
});
