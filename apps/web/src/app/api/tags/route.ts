import { handleListTags, handleCreateTag, handleListTagsForEntity } from "@/lib/crm/tag-route-handlers";
import { createTagRouteServices } from "@/lib/crm/tag-runtime";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleListTags(request, createTagRouteServices()); }
export async function POST(request: Request) { return handleCreateTag(request, createTagRouteServices()); }
