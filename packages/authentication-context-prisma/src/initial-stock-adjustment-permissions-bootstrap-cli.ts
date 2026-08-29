import { prisma } from "@lwill/database/client";
import {
  bootstrapStockAdjustmentPermissions,
  formatStockAdjustmentPermissionsBootstrapError,
  formatStockAdjustmentPermissionsBootstrapResult,
  type StockAdjustmentPermissionsBootstrapPrismaClient,
} from "./initial-stock-adjustment-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapStockAdjustmentPermissions(
    prisma as unknown as StockAdjustmentPermissionsBootstrapPrismaClient,
  );
  console.log(formatStockAdjustmentPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatStockAdjustmentPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
