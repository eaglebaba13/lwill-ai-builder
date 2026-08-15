import { prisma } from "@lwill/database/client";
import {
  bootstrapInitialAdmin,
  formatInitialAdminBootstrapError,
  formatInitialAdminBootstrapResult,
  readInitialAdminBootstrapEnvironment,
  type InitialAdminBootstrapPrismaClient,
} from "./initial-admin-bootstrap";

async function main(): Promise<void> {
  const unsupportedArguments = process.argv.slice(2).filter(
    (argument) => argument !== "--update-password",
  );
  if (unsupportedArguments.length > 0) {
    throw new Error("Unsupported bootstrap argument");
  }

  const input = readInitialAdminBootstrapEnvironment(
    process.env,
    process.argv.includes("--update-password"),
  );
  const result = await bootstrapInitialAdmin(
    prisma as unknown as InitialAdminBootstrapPrismaClient,
    input,
  );
  console.log(formatInitialAdminBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatInitialAdminBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
