import { handleGetSession } from "@/lib/ai/ai-builder-route-handlers";
import { createAiBuilderRouteServices } from "@/lib/ai/ai-builder-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetSession(_request, createAiBuilderRouteServices(), id);
}
