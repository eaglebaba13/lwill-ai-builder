import { prisma } from "@lwill/database/client";
import {
  bootstrapBranchPermissions,
  formatBranchPermissionsBootstrapError,
  formatBranchPermissionsBootstrapResult,
  type BranchPermissionsBootstrapPrismaClient,
} from "./initial-branch-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapBranchPermissions(
    prisma as unknown as BranchPermissionsBootstrapPrismaClient,
  );
  console.log(formatBranchPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatBranchPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
