import { prisma } from "@lwill/database/client";
import {
  formatTenantDomainVerificationError,
  formatTenantDomainVerificationResult,
  readTenantDomainVerificationInputForDomain,
  verifyTenantDomain,
  type TenantDomainVerificationPrismaClient,
} from "./tenant-domain-verification";

async function main(): Promise<void> {
  const input = readTenantDomainVerificationInputForDomain(process.env, process.argv.slice(2));
  const result = await verifyTenantDomain(
    prisma as unknown as TenantDomainVerificationPrismaClient,
    input,
  );
  console.log(formatTenantDomainVerificationResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatTenantDomainVerificationError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
