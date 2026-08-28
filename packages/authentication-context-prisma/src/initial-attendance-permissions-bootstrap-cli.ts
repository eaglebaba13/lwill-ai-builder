import { prisma } from "@lwill/database/client";
import {
  bootstrapAttendancePermissions,
  formatAttendancePermissionsBootstrapError,
  formatAttendancePermissionsBootstrapResult,
  type AttendancePermissionsBootstrapPrismaClient,
} from "./initial-attendance-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapAttendancePermissions(prisma as unknown as AttendancePermissionsBootstrapPrismaClient);
  console.log(formatAttendancePermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatAttendancePermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
