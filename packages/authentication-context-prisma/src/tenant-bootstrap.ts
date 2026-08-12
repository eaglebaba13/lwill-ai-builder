import type { PrismaClient } from "@lwill/database/client";

export interface TenantBootstrapInput {
  readonly tenant: {
    readonly name: string;
    readonly slug: string;
  };
  readonly businessUnit: {
    readonly name: string;
    readonly slug: string;
  };
  readonly branch: {
    readonly name: string;
    readonly slug: string;
  };
  readonly user: {
    readonly email: string;
    readonly displayName?: string | null;
    readonly externalAuthId?: string | null;
  };
  readonly role: {
    readonly code: string;
    readonly name: string;
  };
  readonly permissionCodes: readonly string[];
}

export interface TenantBootstrapResult {
  readonly tenantId: string;
  readonly businessUnitId: string;
  readonly branchId: string;
  readonly userId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly permissionCodes: readonly string[];
}

interface TenantBootstrapPrismaClient {
  readonly tenant: {
    findUnique: (args: { where: { slug: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  readonly businessUnit: {
    findFirst: (args: { where: { tenantId: string; slug: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  readonly branch: {
    findFirst: (args: { where: { tenantId: string; businessUnitId: string; slug: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  readonly user: {
    findFirst: (args: { where: { OR: Array<Record<string, unknown>> } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  readonly tenantMembership: {
    findFirst: (args: { where: { tenantId: string; userId: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  readonly role: {
    findFirst: (args: { where: { tenantId: string; code: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  readonly permission: {
    findUnique: (args: { where: { code: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  readonly rolePermission: {
    findFirst: (args: { where: { tenantId: string; roleId: string; permissionId: string } }) => Promise<unknown | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  readonly membershipRole: {
    findFirst: (args: { where: { tenantId: string; membershipId: string; roleId: string } }) => Promise<unknown | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  readonly passwordCredential?: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

export async function bootstrapTenant(
  prisma: TenantBootstrapPrismaClient,
  input: TenantBootstrapInput,
): Promise<TenantBootstrapResult> {
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: input.tenant.slug } });
  const tenant = existingTenant ?? (await prisma.tenant.create({
    data: {
      name: input.tenant.name,
      slug: input.tenant.slug,
      isActive: true,
    },
  }));

  const existingBusinessUnit = await prisma.businessUnit.findFirst({
    where: { tenantId: tenant.id, slug: input.businessUnit.slug },
  });
  const businessUnit = existingBusinessUnit ?? (await prisma.businessUnit.create({
    data: {
      tenantId: tenant.id,
      name: input.businessUnit.name,
      slug: input.businessUnit.slug,
      isActive: true,
    },
  }));

  const existingBranch = await prisma.branch.findFirst({
    where: {
      tenantId: tenant.id,
      businessUnitId: businessUnit.id,
      slug: input.branch.slug,
    },
  });
  const branch = existingBranch ?? (await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      businessUnitId: businessUnit.id,
      name: input.branch.name,
      slug: input.branch.slug,
      isActive: true,
    },
  }));

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: input.user.email },
        { externalAuthId: input.user.externalAuthId ?? undefined },
      ],
    },
  });
  const user = existingUser ?? (await prisma.user.create({
    data: {
      email: input.user.email,
      displayName: input.user.displayName ?? null,
      externalAuthId: input.user.externalAuthId ?? null,
      isActive: true,
    },
  }));

  const existingMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId: tenant.id, userId: user.id },
  });
  const membership = existingMembership ?? (await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      isActive: true,
    },
  }));

  const existingRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, code: input.role.code },
  });
  const role = existingRole ?? (await prisma.role.create({
    data: {
      tenantId: tenant.id,
      code: input.role.code,
      name: input.role.name,
      description: `Bootstrap role for ${input.tenant.name}`,
      isSystem: false,
      isActive: true,
    },
  }));

  for (const permissionCode of input.permissionCodes) {
    const existingPermission = await prisma.permission.findUnique({ where: { code: permissionCode } });
    const permission = existingPermission ?? (await prisma.permission.create({
      data: {
        code: permissionCode,
        description: `Bootstrap permission for ${input.tenant.name}`,
      },
    }));

    const existingAssignment = await prisma.rolePermission.findFirst({
      where: {
        tenantId: tenant.id,
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    if (existingAssignment === null) {
      await prisma.rolePermission.create({
        data: {
          tenantId: tenant.id,
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const existingMembershipRole = await prisma.membershipRole.findFirst({
    where: { tenantId: tenant.id, membershipId: membership.id, roleId: role.id },
  });

  if (existingMembershipRole === null) {
    await prisma.membershipRole.create({
      data: {
        tenantId: tenant.id,
        membershipId: membership.id,
        roleId: role.id,
      },
    });
  }

  return {
    tenantId: tenant.id,
    businessUnitId: businessUnit.id,
    branchId: branch.id,
    userId: user.id,
    membershipId: membership.id,
    roleId: role.id,
    permissionCodes: input.permissionCodes,
  };
}
