import { prisma } from "@lwill/database/client";
import {
  bootstrapServicePermissions,
  formatServicePermissionsBootstrapError,
  formatServicePermissionsBootstrapResult,
  type ServicePermissionsBootstrapPrismaClient,
} from "./initial-service-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapServicePermissions(
    prisma as unknown as ServicePermissionsBootstrapPrismaClient,
  );
  console.log(formatServicePermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatServicePermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
