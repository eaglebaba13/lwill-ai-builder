import { handleUnlinkTag } from "@/lib/crm/tag-route-handlers";
import { createTagRouteServices } from "@/lib/crm/tag-runtime";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const url = new URL(request.url);
  const tagId = url.searchParams.get("tagId");
  if (!tagId) return new Response(null, { status: 400 });
  return handleUnlinkTag(request, createTagRouteServices(), tagId);
}
