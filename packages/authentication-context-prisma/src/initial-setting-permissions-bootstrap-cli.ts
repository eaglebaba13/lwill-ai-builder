import { prisma } from "@lwill/database/client";
import {
  bootstrapSettingPermissions,
  formatSettingPermissionsBootstrapError,
  formatSettingPermissionsBootstrapResult,
  type SettingPermissionsBootstrapPrismaClient,
} from "./initial-setting-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapSettingPermissions(prisma as unknown as SettingPermissionsBootstrapPrismaClient);
  console.log(formatSettingPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatSettingPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
