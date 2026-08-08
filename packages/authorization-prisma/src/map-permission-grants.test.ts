import { describe, expect, it } from "vitest";
import { mapMembershipToPermissionGrants } from "./map-permission-grants";

describe("mapMembershipToPermissionGrants", () => {
  it("returns no grants for an inactive membership", () => {
    const grants = mapMembershipToPermissionGrants("tenant-a", {
      isActive: false,
      roles: [],
      businessUnitRoles: [],
      branchRoles: [],
    });

    expect(grants).toEqual([]);
  });

  it("maps tenant role permissions", () => {
    const grants = mapMembershipToPermissionGrants("tenant-a", {
      isActive: true,
      roles: [
        {
          role: {
            isActive: true,
            permissions: [
              { permission: { code: "customer.read" } },
              { permission: { code: "customer.write" } },
            ],
          },
        },
      ],
      businessUnitRoles: [],
      branchRoles: [],
    });

    expect(grants).toEqual([
      {
        permissionCode: "customer.read",
        scope: { kind: "tenant", tenantId: "tenant-a" },
      },
      {
        permissionCode: "customer.write",
        scope: { kind: "tenant", tenantId: "tenant-a" },
      },
    ]);
  });

  it("maps business-unit role permissions", () => {
    const grants = mapMembershipToPermissionGrants("tenant-a", {
      isActive: true,
      roles: [],
      businessUnitRoles: [
        {
          businessUnitId: "bu-a",
          role: {
            isActive: true,
            permissions: [{ permission: { code: "inventory.read" } }],
          },
        },
      ],
      branchRoles: [],
    });

    expect(grants).toEqual([
      {
        permissionCode: "inventory.read",
        scope: {
          kind: "business-unit",
          tenantId: "tenant-a",
          businessUnitId: "bu-a",
        },
      },
    ]);
  });

  it("maps branch role permissions", () => {
    const grants = mapMembershipToPermissionGrants("tenant-a", {
      isActive: true,
      roles: [],
      businessUnitRoles: [],
      branchRoles: [
        {
          businessUnitId: "bu-a",
          branchId: "branch-a",
          role: {
            isActive: true,
            permissions: [{ permission: { code: "appointment.read" } }],
          },
        },
      ],
    });

    expect(grants).toEqual([
      {
        permissionCode: "appointment.read",
        scope: {
          kind: "branch",
          tenantId: "tenant-a",
          businessUnitId: "bu-a",
          branchId: "branch-a",
        },
      },
    ]);
  });

  it("ignores inactive roles", () => {
    const grants = mapMembershipToPermissionGrants("tenant-a", {
      isActive: true,
      roles: [
        {
          role: {
            isActive: false,
            permissions: [{ permission: { code: "customer.read" } }],
          },
        },
      ],
      businessUnitRoles: [],
      branchRoles: [],
    });

    expect(grants).toEqual([]);
  });

  it("aggregates grants across all scopes", () => {
    const grants = mapMembershipToPermissionGrants("tenant-a", {
      isActive: true,
      roles: [
        {
          role: {
            isActive: true,
            permissions: [{ permission: { code: "tenant.permission" } }],
          },
        },
      ],
      businessUnitRoles: [
        {
          businessUnitId: "bu-a",
          role: {
            isActive: true,
            permissions: [{ permission: { code: "bu.permission" } }],
          },
        },
      ],
      branchRoles: [
        {
          businessUnitId: "bu-a",
          branchId: "branch-a",
          role: {
            isActive: true,
            permissions: [{ permission: { code: "branch.permission" } }],
          },
        },
      ],
    });

    expect(grants).toHaveLength(3);
  });
});
