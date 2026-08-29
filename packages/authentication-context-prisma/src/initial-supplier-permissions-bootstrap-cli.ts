import { prisma } from "@lwill/database/client";
import {
  bootstrapSupplierPermissions,
  formatSupplierPermissionsBootstrapError,
  formatSupplierPermissionsBootstrapResult,
  type SupplierPermissionsBootstrapPrismaClient,
} from "./initial-supplier-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapSupplierPermissions(
    prisma as unknown as SupplierPermissionsBootstrapPrismaClient,
  );
  console.log(formatSupplierPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatSupplierPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
