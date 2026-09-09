import { handleRecordUsage } from "@/lib/ai/ai-builder-route-handlers";
import { createAiBuilderRouteServices } from "@/lib/ai/ai-builder-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleRecordUsage(request, createAiBuilderRouteServices());
}
