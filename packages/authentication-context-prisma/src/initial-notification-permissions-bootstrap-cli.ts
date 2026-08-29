import { prisma } from "@lwill/database/client";
import {
  bootstrapNotificationPermissions,
  formatNotificationPermissionsBootstrapError,
  formatNotificationPermissionsBootstrapResult,
  type NotificationPermissionsBootstrapPrismaClient,
} from "./initial-notification-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapNotificationPermissions(prisma as unknown as NotificationPermissionsBootstrapPrismaClient);
  console.log(formatNotificationPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatNotificationPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
