import { handleListAttachments, handleCreateAttachment } from "@/lib/crm/attachment-route-handlers";
import { createAttachmentRouteServices } from "@/lib/crm/attachment-runtime";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleListAttachments(request, createAttachmentRouteServices()); }
export async function POST(request: Request) { return handleCreateAttachment(request, createAttachmentRouteServices()); }
