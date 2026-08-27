import { prisma } from "@lwill/database/client";
import {
  bootstrapProductPermissions,
  formatProductPermissionsBootstrapError,
  formatProductPermissionsBootstrapResult,
  type ProductPermissionsBootstrapPrismaClient,
} from "./initial-product-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapProductPermissions(prisma as unknown as ProductPermissionsBootstrapPrismaClient);
  console.log(formatProductPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatProductPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
