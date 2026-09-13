import { handleGetCrmNote } from "@/lib/crm/crm-note-route-handlers";
import { createCrmNoteRouteServices } from "@/lib/crm/crm-note-runtime";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return handleGetCrmNote(_request, createCrmNoteRouteServices(), id); }
