import { handleListSettlements } from "@/lib/crm/settlement-route-handlers";
import { createSettlementRouteServices } from "@/lib/crm/settlement-runtime";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleListSettlements(request, createSettlementRouteServices()); }
