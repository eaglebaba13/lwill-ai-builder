import { describe, expect, it } from "vitest";
import { authorize } from "../../authorization/src/authorize";
import { mapMembershipToPermissionGrants } from "../../authorization-prisma/src/map-permission-grants";
import { bootstrapTenant } from "./tenant-bootstrap";

describe("bootstrapTenant", () => {
  it("creates the tenant hierarchy, membership, role, and permission assignments", async () => {
    const created: Record<string, unknown>[] = [];
    const prismaClient = {
      tenant: {
        findUnique: async ({ where }: { where: { slug: string } }) => {
          if (where.slug === "acme") {
            return null;
          }
          return null;
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "tenant", data });
          return { id: "tenant-1", ...data };
        },
      },
      businessUnit: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "businessUnit", data });
          return { id: "bu-1", ...data };
        },
      },
      branch: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "branch", data });
          return { id: "branch-1", ...data };
        },
      },
      user: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "user", data });
          return { id: "user-1", ...data };
        },
      },
      tenantMembership: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "tenantMembership", data });
          return { id: "membership-1", ...data };
        },
      },
      role: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "role", data });
          return { id: "role-1", ...data };
        },
      },
      permission: {
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "permission", data });
          return { id: "permission-1", ...data };
        },
      },
      rolePermission: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "rolePermission", data });
          return { id: "role-permission-1", ...data };
        },
      },
      membershipRole: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ model: "membershipRole", data });
          return { id: "membership-role-1", ...data };
        },
      },
      passwordCredential: {
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "credential-1", ...data }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "credential-1", ...data }),
      },
    };

    const result = await bootstrapTenant(prismaClient as never, {
      tenant: { name: "Acme Salon", slug: "acme" },
      businessUnit: { name: "North Studio", slug: "north-studio" },
      branch: { name: "Main Branch", slug: "main-branch" },
      user: {
        email: "admin@acme.example",
        displayName: "Acme Admin",
        externalAuthId: "ext-acme-admin",
      },
      role: { code: "tenant-admin", name: "Tenant Admin" },
      permissionCodes: ["tenant.manage"],
    });

    expect(result.tenantId).toBe("tenant-1");
    expect(result.businessUnitId).toBe("bu-1");
    expect(result.branchId).toBe("branch-1");
    expect(result.userId).toBe("user-1");
    expect(result.membershipId).toBe("membership-1");
    expect(result.roleId).toBe("role-1");
    expect(result.permissionCodes).toEqual(["tenant.manage"]);
    expect(created.some((entry) => entry.model === "rolePermission")).toBe(true);
    expect(created.some((entry) => entry.model === "membershipRole")).toBe(true);
  });

  it("resolves grants for a tenant admin and denies cross-tenant access", () => {
    const membership = {
      isActive: true,
      roles: [
        {
          role: {
            isActive: true,
            permissions: [{ permission: { code: "tenant.manage" } }],
          },
        },
      ],
      businessUnitRoles: [],
      branchRoles: [],
    };

    const grants = mapMembershipToPermissionGrants("tenant-1", membership);
    const tenantAllowed = authorize(
      {
        permissionCode: "tenant.manage",
        scope: { kind: "tenant", tenantId: "tenant-1" },
      },
      grants,
    );
    const crossTenantDenied = authorize(
      {
        permissionCode: "tenant.manage",
        scope: { kind: "tenant", tenantId: "tenant-2" },
      },
      grants,
    );

    expect(tenantAllowed.allowed).toBe(true);
    expect(crossTenantDenied.allowed).toBe(false);
  });

  it("denies a user without the required role or permission", () => {
    const grants = mapMembershipToPermissionGrants("tenant-1", {
      isActive: true,
      roles: [],
      businessUnitRoles: [],
      branchRoles: [],
    });

    const denied = authorize(
      {
        permissionCode: "tenant.manage",
        scope: { kind: "tenant", tenantId: "tenant-1" },
      },
      grants,
    );

    expect(denied.allowed).toBe(false);
  });
});
