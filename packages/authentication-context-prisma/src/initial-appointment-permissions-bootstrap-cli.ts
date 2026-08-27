import { prisma } from "@lwill/database/client";
import {
  bootstrapAppointmentPermissions,
  formatAppointmentPermissionsBootstrapError,
  formatAppointmentPermissionsBootstrapResult,
  type AppointmentPermissionsBootstrapPrismaClient,
} from "./initial-appointment-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapAppointmentPermissions(
    prisma as unknown as AppointmentPermissionsBootstrapPrismaClient,
  );
  console.log(formatAppointmentPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatAppointmentPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
