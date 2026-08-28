import { prisma } from "@lwill/database/client";
import {
  bootstrapBusinessUnitPermissions,
  formatBusinessUnitPermissionsBootstrapError,
  formatBusinessUnitPermissionsBootstrapResult,
  type BusinessUnitPermissionsBootstrapPrismaClient,
} from "./initial-business-unit-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapBusinessUnitPermissions(
    prisma as unknown as BusinessUnitPermissionsBootstrapPrismaClient,
  );
  console.log(formatBusinessUnitPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatBusinessUnitPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
