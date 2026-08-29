import { prisma } from "@lwill/database/client";
import {
  bootstrapPurchaseReceiptPermissions,
  formatPurchaseReceiptPermissionsBootstrapError,
  formatPurchaseReceiptPermissionsBootstrapResult,
  type PurchaseReceiptPermissionsBootstrapPrismaClient,
} from "./initial-purchase-receipt-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapPurchaseReceiptPermissions(
    prisma as unknown as PurchaseReceiptPermissionsBootstrapPrismaClient,
  );
  console.log(formatPurchaseReceiptPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatPurchaseReceiptPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
