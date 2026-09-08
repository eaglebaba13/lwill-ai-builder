import { prisma } from "@lwill/database/client";
import {
  bootstrapAiProjectPermissions,
  formatAiProjectPermissionsBootstrapError,
  formatAiProjectPermissionsBootstrapResult,
  type AiProjectPermissionsBootstrapPrismaClient,
} from "./initial-ai-project-permissions-bootstrap";

async function main(): Promise<void> {
  const result = await bootstrapAiProjectPermissions(prisma as unknown as AiProjectPermissionsBootstrapPrismaClient);
  console.log(formatAiProjectPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatAiProjectPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
