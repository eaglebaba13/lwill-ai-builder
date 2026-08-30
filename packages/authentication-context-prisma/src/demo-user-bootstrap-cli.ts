import { prisma } from "@lwill/database/client";
import {
  bootstrapDemoUsers,
  formatDemoUserBootstrapError,
  formatDemoUserBootstrapResult,
  readDemoUserBootstrapEnvironment,
  type DemoUserBootstrapPrismaClient,
} from "./demo-user-bootstrap";

async function main(): Promise<void> {
  const unsupportedArguments = process.argv.slice(2).filter(
    (argument) => argument !== "--update-password",
  );
  if (unsupportedArguments.length > 0) {
    throw new Error("Unsupported bootstrap argument");
  }

  const updatePassword = process.argv.includes("--update-password");
  const input = readDemoUserBootstrapEnvironment(process.env);
  const result = await bootstrapDemoUsers(
    prisma as unknown as DemoUserBootstrapPrismaClient,
    {
      ...input,
      users: input.users.map((user) => ({ ...user, updatePassword })),
    },
  );
  console.log(formatDemoUserBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatDemoUserBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
