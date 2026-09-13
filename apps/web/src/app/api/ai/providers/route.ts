import { handleListProviders } from "@/lib/ai/ai-inference-route-handlers";
import { createAiInferenceRouteServices } from "@/lib/ai/ai-inference-runtime";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleListProviders(request, createAiInferenceRouteServices()); }
