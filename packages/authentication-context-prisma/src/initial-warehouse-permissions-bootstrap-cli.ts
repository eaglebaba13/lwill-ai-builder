import { prisma } from "@lwill/database/client";
import {
  bootstrapWarehousePermissions,
  formatWarehousePermissionsBootstrapError,
  formatWarehousePermissionsBootstrapResult,
  type WarehousePermissionsBootstrapPrismaClient,
} from "./initial-warehouse-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapWarehousePermissions(
    prisma as unknown as WarehousePermissionsBootstrapPrismaClient,
  );
  console.log(formatWarehousePermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatWarehousePermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
