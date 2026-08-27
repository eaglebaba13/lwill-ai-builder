import { prisma } from "@lwill/database/client";
import {
  bootstrapPackagePermissions,
  formatPackagePermissionsBootstrapError,
  formatPackagePermissionsBootstrapResult,
  type PackagePermissionsBootstrapPrismaClient,
} from "./initial-package-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapPackagePermissions(
    prisma as unknown as PackagePermissionsBootstrapPrismaClient,
  );
  console.log(formatPackagePermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatPackagePermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
