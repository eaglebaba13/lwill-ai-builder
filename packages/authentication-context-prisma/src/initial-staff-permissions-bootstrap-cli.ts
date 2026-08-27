import { prisma } from "@lwill/database/client";
import {
  bootstrapStaffPermissions,
  formatStaffPermissionsBootstrapError,
  formatStaffPermissionsBootstrapResult,
  type StaffPermissionsBootstrapPrismaClient,
} from "./initial-staff-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapStaffPermissions(prisma as unknown as StaffPermissionsBootstrapPrismaClient);
  console.log(formatStaffPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatStaffPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
