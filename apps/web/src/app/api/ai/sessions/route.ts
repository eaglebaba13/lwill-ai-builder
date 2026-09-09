import { handleCreateSession, handleListSessions } from "@/lib/ai/ai-builder-route-handlers";
import { createAiBuilderRouteServices } from "@/lib/ai/ai-builder-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListSessions(request, createAiBuilderRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateSession(request, createAiBuilderRouteServices());
}
