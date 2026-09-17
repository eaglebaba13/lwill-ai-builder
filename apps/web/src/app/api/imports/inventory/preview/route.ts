import { handleInventoryImportPreview } from "@/lib/x-nail/inventory-transfer-route-handlers";
import { createInventoryTransferServices } from "@/lib/x-nail/inventory-transfer-runtime";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "An XLSX file is required." }, { status: 400 });
  return handleInventoryImportPreview(createInventoryTransferServices(), { filename: file.name, contentType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
}