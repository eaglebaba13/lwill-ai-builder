import { handleInventoryTemplate } from "@/lib/x-nail/inventory-transfer-route-handlers";
import { createInventoryTransferServices } from "@/lib/x-nail/inventory-transfer-runtime";

export const runtime = "nodejs";
export async function GET(): Promise<Response> { return handleInventoryTemplate(createInventoryTransferServices()); }