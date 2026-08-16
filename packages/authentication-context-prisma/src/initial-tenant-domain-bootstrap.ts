import { INITIAL_TENANT } from "./initial-hierarchy-bootstrap";

export const INITIAL_TENANT_DOMAIN = "builder.lwill.in";

export class InitialTenantDomainBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitialTenantDomainBootstrapError";
  }
}

interface TenantRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
}

interface TenantDomainRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly domain: string;
  readonly isPrimary: boolean;
  readonly verificationStatus: string;
  readonly isActive: boolean;
}

interface InitialTenantDomainTransactionClient {
  readonly tenant: {
    findMany(args: {
      where: { OR: Array<{ name: string } | { slug: string }> };
      select: { id: true; name: true; slug: true; isActive: true };
    }): Promise<TenantRecord[]>;
  };
  readonly tenantDomain: {
    findUnique(args: {
      where: { domain: string };
      select: {
        id: true;
        tenantId: true;
        domain: true;
        isPrimary: true;
        verificationStatus: true;
        isActive: true;
      };
    }): Promise<TenantDomainRecord | null>;
    create(args: {
      data: { tenantId: string; domain: string; isActive: true };
      select: {
        id: true;
        tenantId: true;
        domain: true;
        isPrimary: true;
        verificationStatus: true;
        isActive: true;
      };
    }): Promise<TenantDomainRecord>;
  };
}

export interface InitialTenantDomainBootstrapPrismaClient {
  $transaction<T>(
    callback: (transaction: InitialTenantDomainTransactionClient) => Promise<T>,
  ): Promise<T>;
}

export interface InitialTenantDomainBootstrapResult {
  readonly tenantId: string;
  readonly domain: string;
  readonly domainCreated: boolean;
  readonly isPrimary: boolean;
  readonly verificationStatus: string;
  readonly isActive: boolean;
}

function resolveApprovedTenant(records: readonly TenantRecord[]): TenantRecord {
  if (records.length === 0) {
    throw new InitialTenantDomainBootstrapError("Approved tenant is missing");
  }
  if (records.length > 1) {
    throw new InitialTenantDomainBootstrapError("Approved tenant is ambiguous");
  }

  const tenant = records[0];
  if (
    tenant === undefined
    || tenant.name !== INITIAL_TENANT.name
    || tenant.slug !== INITIAL_TENANT.slug
  ) {
    throw new InitialTenantDomainBootstrapError("Approved tenant record is conflicting");
  }
  if (!tenant.isActive) {
    throw new InitialTenantDomainBootstrapError("Approved tenant is inactive");
  }
  return tenant;
}

export async function bootstrapInitialTenantDomain(
  prisma: InitialTenantDomainBootstrapPrismaClient,
): Promise<InitialTenantDomainBootstrapResult> {
  return prisma.$transaction(async (transaction) => {
    const tenant = resolveApprovedTenant(await transaction.tenant.findMany({
      where: {
        OR: [{ name: INITIAL_TENANT.name }, { slug: INITIAL_TENANT.slug }],
      },
      select: { id: true, name: true, slug: true, isActive: true },
    }));

    let tenantDomain = await transaction.tenantDomain.findUnique({
      where: { domain: INITIAL_TENANT_DOMAIN },
      select: {
        id: true,
        tenantId: true,
        domain: true,
        isPrimary: true,
        verificationStatus: true,
        isActive: true,
      },
    });
    const domainCreated = tenantDomain === null;

    if (tenantDomain !== null && tenantDomain.tenantId !== tenant.id) {
      throw new InitialTenantDomainBootstrapError(
        `${INITIAL_TENANT_DOMAIN} is assigned to another tenant`,
      );
    }
    if (tenantDomain !== null && !tenantDomain.isActive) {
      throw new InitialTenantDomainBootstrapError(
        `${INITIAL_TENANT_DOMAIN} mapping is inactive`,
      );
    }

    tenantDomain ??= await transaction.tenantDomain.create({
      data: {
        tenantId: tenant.id,
        domain: INITIAL_TENANT_DOMAIN,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        domain: true,
        isPrimary: true,
        verificationStatus: true,
        isActive: true,
      },
    });

    return {
      tenantId: tenant.id,
      domain: tenantDomain.domain,
      domainCreated,
      isPrimary: tenantDomain.isPrimary,
      verificationStatus: tenantDomain.verificationStatus,
      isActive: tenantDomain.isActive,
    };
  });
}

export function formatInitialTenantDomainBootstrapResult(
  result: InitialTenantDomainBootstrapResult,
): string {
  return JSON.stringify({ status: "completed", ...result });
}

export function formatInitialTenantDomainBootstrapError(error: unknown): string {
  return error instanceof InitialTenantDomainBootstrapError
    ? error.message
    : "Initial tenant domain bootstrap failed";
}