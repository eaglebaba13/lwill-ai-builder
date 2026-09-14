import { handleGetSettlement } from "@/lib/crm/settlement-route-handlers";
import { createSettlementRouteServices } from "@/lib/crm/settlement-runtime";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return handleGetSettlement(_request, createSettlementRouteServices(), id); }
