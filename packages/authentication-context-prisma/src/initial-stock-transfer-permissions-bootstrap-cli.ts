import { prisma } from "@lwill/database/client";
import {
  bootstrapStockTransferPermissions,
  formatStockTransferPermissionsBootstrapError,
  formatStockTransferPermissionsBootstrapResult,
  type StockTransferPermissionsBootstrapPrismaClient,
} from "./initial-stock-transfer-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapStockTransferPermissions(
    prisma as unknown as StockTransferPermissionsBootstrapPrismaClient,
  );
  console.log(formatStockTransferPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatStockTransferPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
