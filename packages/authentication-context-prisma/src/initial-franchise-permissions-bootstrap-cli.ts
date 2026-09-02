import { prisma } from "@lwill/database/client";
import {
  bootstrapFranchisePermissions,
  formatFranchisePermissionsBootstrapError,
  formatFranchisePermissionsBootstrapResult,
  type FranchisePermissionsBootstrapPrismaClient,
} from "./initial-franchise-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapFranchisePermissions(
    prisma as unknown as FranchisePermissionsBootstrapPrismaClient,
  );
  console.log(formatFranchisePermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatFranchisePermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
