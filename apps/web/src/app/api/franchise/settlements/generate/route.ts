import { handleGenerateSettlement } from "@/lib/crm/settlement-route-handlers";
import { createSettlementRouteServices } from "@/lib/crm/settlement-runtime";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleGenerateSettlement(request, createSettlementRouteServices()); }
