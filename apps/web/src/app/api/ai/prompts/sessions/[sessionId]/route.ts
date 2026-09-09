import { handleListPromptsForSession } from "@/lib/ai/ai-builder-route-handlers";
import { createAiBuilderRouteServices } from "@/lib/ai/ai-builder-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await context.params;
  return handleListPromptsForSession(_request, createAiBuilderRouteServices(), sessionId);
}
