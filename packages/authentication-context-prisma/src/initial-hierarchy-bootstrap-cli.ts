import { prisma } from "@lwill/database/client";
import {
  bootstrapInitialHierarchy,
  formatInitialHierarchyBootstrapError,
  formatInitialHierarchyBootstrapResult,
  type InitialHierarchyBootstrapPrismaClient,
} from "./initial-hierarchy-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapInitialHierarchy(
    prisma as unknown as InitialHierarchyBootstrapPrismaClient,
  );
  console.log(formatInitialHierarchyBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatInitialHierarchyBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });