import { handleComplete } from "@/lib/ai/ai-inference-route-handlers";
import { createAiInferenceRouteServices } from "@/lib/ai/ai-inference-runtime";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleComplete(request, createAiInferenceRouteServices()); }
