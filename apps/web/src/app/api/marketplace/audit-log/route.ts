import { handleListMarketplaceAuditLogs } from "@/lib/crm/marketplace-audit-route-handlers";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListMarketplaceAuditLogs(request);
}
