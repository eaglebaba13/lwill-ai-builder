import { prisma } from "@lwill/database/client";
import {
  bootstrapInitialTenantDomain,
  formatInitialTenantDomainBootstrapError,
  formatInitialTenantDomainBootstrapResult,
  type InitialTenantDomainBootstrapPrismaClient,
} from "./initial-tenant-domain-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapInitialTenantDomain(
    prisma as unknown as InitialTenantDomainBootstrapPrismaClient,
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