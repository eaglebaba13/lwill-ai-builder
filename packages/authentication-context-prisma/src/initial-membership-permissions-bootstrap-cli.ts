import { prisma } from "@lwill/database/client";
import {
  bootstrapMembershipPermissions,
  formatMembershipPermissionsBootstrapError,
  formatMembershipPermissionsBootstrapResult,
  type MembershipPermissionsBootstrapPrismaClient,
} from "./initial-membership-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapMembershipPermissions(prisma as unknown as MembershipPermissionsBootstrapPrismaClient);
  console.log(formatMembershipPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatMembershipPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
