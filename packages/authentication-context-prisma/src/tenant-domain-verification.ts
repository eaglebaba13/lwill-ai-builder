import { INITIAL_TENANT, INITIAL_TENANT_ADMIN_PERMISSION_CODES } from "./initial-hierarchy-bootstrap";
import { INITIAL_TENANT_DOMAIN } from "./initial-tenant-domain-bootstrap";

const REQUIRED_PERMISSION_CODE = INITIAL_TENANT_ADMIN_PERMISSION_CODES[0];

export class TenantDomainVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantDomainVerificationError";
  }
}

export interface TenantDomainVerificationEnvironment {
  readonly LWILL_VERIFY_TENANT_DOMAIN_ADMIN_EMAIL?: string;
}

export interface TenantDomainVerificationInput {
  readonly actorEmail: string;
  readonly confirmedDomain: string;
}

interface VerificationTransactionClient {
  readonly tenant: {
    findMany(args: {
      where: { OR: Array<{ name: string } | { slug: string }> };
      select: { id: true; name: true; slug: true; isActive: true };
    }): Promise<Array<{ id: string; name: string; slug: string; isActive: boolean }>>;
  };
  readonly tenantDomain: {
    findUnique(args: {
      where: { domain: string };
      select: {
        id: true;
        tenantId: true;
        domain: true;
        verificationStatus: true;
        isActive: true;
      };
    }): Promise<{
      id: string;
      tenantId: string;
      domain: string;
      verificationStatus: string;
      isActive: boolean;
    } | null>;
    updateMany(args: {
      where: {
        id: string;
        tenantId: string;
        isActive: true;
        verificationStatus: "pending";
      };
      data: { verificationStatus: "verified" };
    }): Promise<{ count: number }>;
  };
  readonly user: {
    findUnique(args: {
      where: { email: string };
      select: { id: true; isActive: true };
    }): Promise<{ id: string; isActive: boolean } | null>;
  };
  readonly tenantMembership: {
    findUnique(args: {
      where: { tenantId_userId: { tenantId: string; userId: string } };
      select: {
        isActive: true;
        roles: {
          select: {
            role: {
              select: {
                isActive: true;
                permissions: {
                  select: { permission: { select: { code: true } } };
                };
              };
            };
          };
        };
      };
    }): Promise<{
      isActive: boolean;
      roles: Array<{
        role: {
          isActive: boolean;
          permissions: Array<{ permission: { code: string } }>;
        };
      }>;
    } | null>;
  };
  readonly auditLog: {
    create(args: {
      data: {
        tenantId: string;
        actorUserId: string;
        action: "tenant-domain.verified";
        entityType: "TenantDomain";
        entityId: string;
        metadata: {
          domain: string;
          previousVerificationStatus: "pending";
          verificationMethod: "operator-attestation";
        };
      };
    }): Promise<unknown>;
  };
}

export interface TenantDomainVerificationPrismaClient {
  $transaction<T>(
    callback: (transaction: VerificationTransactionClient) => Promise<T>,
  ): Promise<T>;
}

export interface TenantDomainVerificationResult {
  readonly tenantId: string;
  readonly domain: string;
  readonly verificationStatus: "verified";
  readonly verificationChanged: boolean;
  readonly actorUserId: string;
}

export function readTenantDomainVerificationInput(
  environment: TenantDomainVerificationEnvironment,
  arguments_: readonly string[],
): TenantDomainVerificationInput {
  const actorEmail = environment.LWILL_VERIFY_TENANT_DOMAIN_ADMIN_EMAIL?.trim().toLowerCase();
  if (!actorEmail) {
    throw new TenantDomainVerificationError(
      "Missing required environment variable: LWILL_VERIFY_TENANT_DOMAIN_ADMIN_EMAIL",
    );
  }
  if (arguments_.length !== 1 || arguments_[0] !== `--confirm=${INITIAL_TENANT_DOMAIN}`) {
    throw new TenantDomainVerificationError(
      `Explicit confirmation required: --confirm=${INITIAL_TENANT_DOMAIN}`,
    );
  }
  return { actorEmail, confirmedDomain: INITIAL_TENANT_DOMAIN };
}

export async function verifyInitialTenantDomain(
  prisma: TenantDomainVerificationPrismaClient,
  input: TenantDomainVerificationInput,
): Promise<TenantDomainVerificationResult> {
  if (input.confirmedDomain !== INITIAL_TENANT_DOMAIN) {
    throw new TenantDomainVerificationError("Tenant domain confirmation does not match");
  }

  return prisma.$transaction(async (transaction) => {
    const tenants = await transaction.tenant.findMany({
      where: { OR: [{ name: INITIAL_TENANT.name }, { slug: INITIAL_TENANT.slug }] },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    const tenant = tenants[0];
    if (
      tenants.length !== 1
      || tenant === undefined
      || tenant.name !== INITIAL_TENANT.name
      || tenant.slug !== INITIAL_TENANT.slug
      || !tenant.isActive
    ) {
      throw new TenantDomainVerificationError("Approved active tenant is missing or ambiguous");
    }

    const tenantDomain = await transaction.tenantDomain.findUnique({
      where: { domain: INITIAL_TENANT_DOMAIN },
      select: {
        id: true,
        tenantId: true,
        domain: true,
        verificationStatus: true,
        isActive: true,
      },
    });
    if (
      tenantDomain === null
      || !tenantDomain.isActive
      || tenantDomain.tenantId !== tenant.id
    ) {
      throw new TenantDomainVerificationError("Active tenant domain ownership does not match");
    }
    if (
      tenantDomain.verificationStatus !== "pending"
      && tenantDomain.verificationStatus !== "verified"
    ) {
      throw new TenantDomainVerificationError("Tenant domain verification state is invalid");
    }

    const actor = await transaction.user.findUnique({
      where: { email: input.actorEmail },
      select: { id: true, isActive: true },
    });
    if (actor === null || !actor.isActive) {
      throw new TenantDomainVerificationError("Tenant domain verification is not authorized");
    }
    const membership = await transaction.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: actor.id } },
      select: {
        isActive: true,
        roles: {
          select: {
            role: {
              select: {
                isActive: true,
                permissions: {
                  select: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });
    const authorized = membership?.isActive === true && membership.roles.some(
      ({ role }) => role.isActive && role.permissions.some(
        ({ permission }) => permission.code === REQUIRED_PERMISSION_CODE,
      ),
    );
    if (!authorized) {
      throw new TenantDomainVerificationError("Tenant domain verification is not authorized");
    }

    let verificationChanged = false;
    if (tenantDomain.verificationStatus === "pending") {
      const transition = await transaction.tenantDomain.updateMany({
        where: {
          id: tenantDomain.id,
          tenantId: tenant.id,
          isActive: true,
          verificationStatus: "pending",
        },
        data: { verificationStatus: "verified" },
      });
      verificationChanged = transition.count === 1;
      if (verificationChanged) {
        await transaction.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorUserId: actor.id,
            action: "tenant-domain.verified",
            entityType: "TenantDomain",
            entityId: tenantDomain.id,
            metadata: {
              domain: tenantDomain.domain,
              previousVerificationStatus: "pending",
              verificationMethod: "operator-attestation",
            },
          },
        });
      }
    }

    return {
      tenantId: tenant.id,
      domain: tenantDomain.domain,
      verificationStatus: "verified",
      verificationChanged,
      actorUserId: actor.id,
    };
  });
}

export function formatTenantDomainVerificationResult(
  result: TenantDomainVerificationResult,
): string {
  return JSON.stringify({ status: "completed", ...result });
}

export function formatTenantDomainVerificationError(error: unknown): string {
  return error instanceof TenantDomainVerificationError
    ? error.message
    : "Tenant domain verification failed";
}