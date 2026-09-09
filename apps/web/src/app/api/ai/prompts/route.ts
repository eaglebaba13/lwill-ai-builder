import { handleRecordPrompt } from "@/lib/ai/ai-builder-route-handlers";
import { createAiBuilderRouteServices } from "@/lib/ai/ai-builder-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleRecordPrompt(request, createAiBuilderRouteServices());
}
