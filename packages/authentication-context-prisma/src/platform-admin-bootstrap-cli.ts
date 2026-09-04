import { prisma } from "@lwill/database/client";
import {
  bootstrapPlatformAdmin,
  formatPlatformAdminBootstrapError,
  formatPlatformAdminBootstrapResult,
  type PlatformAdminBootstrapPrismaClient,
} from "./platform-admin-bootstrap";

function parseOwnerEmail(): string {
  const email = process.argv[2];
  if (email === undefined || email === null || email.trim() === "") {
    throw new Error("Usage: bootstrap:platform-admin <owner-email>");
  }
  return email.trim();
}

async function main(): Promise<void> {
  const ownerEmail = parseOwnerEmail();
  const result = await bootstrapPlatformAdmin(
    prisma as unknown as PlatformAdminBootstrapPrismaClient,
    { ownerEmail },
  );
  console.log(formatPlatformAdminBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatPlatformAdminBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
