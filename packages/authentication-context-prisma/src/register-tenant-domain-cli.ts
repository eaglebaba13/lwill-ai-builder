import { prisma } from "@lwill/database/client";
import {
  bootstrapTenantDomain,
  formatInitialTenantDomainBootstrapError,
  formatInitialTenantDomainBootstrapResult,
  type InitialTenantDomainBootstrapPrismaClient,
} from "./initial-tenant-domain-bootstrap";

function readDomainArgument(argv: readonly string[]): string {
  const argument = argv.find((entry) => entry.startsWith("--domain="));
  const domain = argument?.slice("--domain=".length).trim().toLowerCase();
  if (!domain) {
    throw new Error("Missing required argument: --domain=<domain>");
  }
  return domain;
}

async function main(): Promise<void> {
  const domain = readDomainArgument(process.argv.slice(2));
  const result = await bootstrapTenantDomain(
    prisma as unknown as InitialTenantDomainBootstrapPrismaClient,
    domain,
  );
  console.log(formatInitialTenantDomainBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatInitialTenantDomainBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
