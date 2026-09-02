import { prisma } from "@lwill/database/client";
import {
  createNotificationQueueProcessorService,
  type NotificationQueueProcessorResult,
} from "./notification-queue-processor-service";

function parseArgs(): { tenantId?: string; batchSize?: number } {
  const args = process.argv.slice(2);
  const parsed: { tenantId?: string; batchSize?: number } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tenant-id" && args[i + 1]) {
      parsed.tenantId = args[i + 1];
      i += 1;
    } else if (args[i] === "--batch-size" && args[i + 1]) {
      const size = Number.parseInt(args[i + 1] ?? "", 10);
      if (!Number.isNaN(size) && size > 0) {
        parsed.batchSize = size;
      }
      i += 1;
    }
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const processor = createNotificationQueueProcessorService(prisma as never);
  const input: { tenantId?: string; batchSize?: number } = {};
  if (args.tenantId !== undefined) {
    input.tenantId = args.tenantId;
  }
  if (args.batchSize !== undefined) {
    input.batchSize = args.batchSize;
  }
  const result: NotificationQueueProcessorResult = await processor(input);

  console.log(
    JSON.stringify({
      status: "completed",
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        status: "failed",
        error: error instanceof Error ? error.message : "queue processor failed",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
