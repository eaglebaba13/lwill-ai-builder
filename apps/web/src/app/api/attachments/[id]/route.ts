import { handleGetAttachment } from "@/lib/crm/attachment-route-handlers";
import { createAttachmentRouteServices } from "@/lib/crm/attachment-runtime";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return handleGetAttachment(_request, createAttachmentRouteServices(), id); }
