import { handleGetTag } from "@/lib/crm/tag-route-handlers";
import { createTagRouteServices } from "@/lib/crm/tag-runtime";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return handleGetTag(_request, createTagRouteServices(), id); }
