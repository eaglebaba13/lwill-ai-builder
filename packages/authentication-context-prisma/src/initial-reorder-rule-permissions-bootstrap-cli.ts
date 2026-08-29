import { prisma } from "@lwill/database/client";
import {
  bootstrapReorderRulePermissions,
  formatReorderRulePermissionsBootstrapError,
  formatReorderRulePermissionsBootstrapResult,
  type ReorderRulePermissionsBootstrapPrismaClient,
} from "./initial-reorder-rule-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapReorderRulePermissions(
    prisma as unknown as ReorderRulePermissionsBootstrapPrismaClient,
  );
  console.log(formatReorderRulePermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatReorderRulePermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
