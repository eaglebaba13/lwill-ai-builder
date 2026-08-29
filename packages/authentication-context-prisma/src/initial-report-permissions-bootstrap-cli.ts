import { prisma } from "@lwill/database/client";
import {
  bootstrapReportPermissions,
  formatReportPermissionsBootstrapError,
  formatReportPermissionsBootstrapResult,
  type ReportPermissionsBootstrapPrismaClient,
} from "./initial-report-permissions-bootstrap";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Unsupported bootstrap argument");
  }

  const result = await bootstrapReportPermissions(
    prisma as unknown as ReportPermissionsBootstrapPrismaClient,
  );
  console.log(formatReportPermissionsBootstrapResult(result));
}

main()
  .catch((error: unknown) => {
    console.error(formatReportPermissionsBootstrapError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
