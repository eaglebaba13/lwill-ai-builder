import { handleApproveSettlement } from "@/lib/crm/settlement-route-handlers";
import { createSettlementRouteServices } from "@/lib/crm/settlement-runtime";
export const runtime = "nodejs";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return handleApproveSettlement(_request, createSettlementRouteServices(), id); }
