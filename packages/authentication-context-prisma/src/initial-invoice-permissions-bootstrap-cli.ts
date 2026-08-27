import { prisma } from "@lwill/database/client";
import {
  bootstrapInvoicePermissions,
  formatInvoicePermissionsBootstrapError,
  formatInvoicePermissionsBootstrapResult,
  type InvoicePermissionsBootstrapPrismaClient,
} from "./initial-invoice-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapInvoicePermissions(prisma as unknown as InvoicePermissionsBootstrapPrismaClient);
  console.log(formatInvoicePermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatInvoicePermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
