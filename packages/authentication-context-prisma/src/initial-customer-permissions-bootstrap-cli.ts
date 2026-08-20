import { prisma } from "@lwill/database/client";
import {
  bootstrapCustomerPermissions,
  formatCustomerPermissionsBootstrapError,
  formatCustomerPermissionsBootstrapResult,
  type CustomerPermissionsBootstrapPrismaClient,
} from "./initial-customer-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapCustomerPermissions(
    prisma as unknown as CustomerPermissionsBootstrapPrismaClient,
  );
  console.log(formatCustomerPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatCustomerPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
