import {
  createInventoryPdf,
  createInventoryTemplate,
  createInventoryWorkbook,
  createPurchasePdf,
  createPurchaseWorkbook,
  INVENTORY_MAX_UPLOAD_BYTES,
  parseInventoryWorkbook,
  type InventoryBranch,
  type InventoryCategory,
  type InventoryImportRow,
  type InventoryProduct,
  type InventoryStockItem,
  type PurchaseExportReceipt,
} from "./inventory-transfer";
import { downloadResponse, PDF_CONTENT_TYPE, XLSX_CONTENT_TYPE } from "./data-transfer";

export type InventoryTransferAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };
export type InventoryExportDataset = "inventory" | "purchases";
export type InventoryExportFormat = "xlsx" | "pdf";

export interface InventoryTransferServices {
  readonly authorize: (permissionCode: string) => Promise<InventoryTransferAuthorization>;
  readonly listProducts: (tenantId: string) => Promise<readonly InventoryProduct[]>;
  readonly listCategories: (tenantId: string) => Promise<readonly InventoryCategory[]>;
  readonly listStockItems: (tenantId: string) => Promise<readonly InventoryStockItem[]>;
  readonly listBranches: (tenantId: string) => Promise<readonly InventoryBranch[]>;
  readonly listPurchaseReceipts: (tenantId: string) => Promise<readonly PurchaseExportReceipt[]>;
  readonly importProducts: (tenantId: string, rows: readonly InventoryImportRow[]) => Promise<number>;
}

function authResponse(auth: InventoryTransferAuthorization): Response | null {
  if (auth.outcome === "unauthenticated") return Response.json({ error: "Authentication required." }, { status: 401 });
  if (auth.outcome === "forbidden") return Response.json({ error: "Permission denied." }, { status: 403 });
  return null;
}

function dateStamp(date: Date): string { return date.toISOString().slice(0, 10); }

export async function handleInventoryTemplate(services: InventoryTransferServices): Promise<Response> {
  const auth = await services.authorize("product.write");
  const denied = authResponse(auth);
  if (denied) return denied;
  return downloadResponse(await createInventoryTemplate(), XLSX_CONTENT_TYPE, "X-Nail-Inventory-Template.xlsx");
}

export async function handleInventoryExport(services: InventoryTransferServices, dataset: InventoryExportDataset, format: InventoryExportFormat, generatedAt = new Date()): Promise<Response> {
  const permission = dataset === "inventory" ? "product.read" : "purchaseReceipt.read";
  const auth = await services.authorize(permission);
  const denied = authResponse(auth);
  if (auth.outcome !== "authorized") return denied ?? Response.json({ error: "Permission denied." }, { status: 403 });
  const isExcel = format === "xlsx";
  let body: Uint8Array;
  let label: string;
  if (dataset === "inventory") {
    const [products, categories, stockItems, branches] = await Promise.all([
      services.listProducts(auth.tenantId), services.listCategories(auth.tenantId), services.listStockItems(auth.tenantId), services.listBranches(auth.tenantId),
    ]);
    const data = { products, categories, stockItems, branches };
    body = isExcel ? await createInventoryWorkbook(data) : await createInventoryPdf(data, generatedAt);
    label = "Inventory";
  } else {
    const receipts = await services.listPurchaseReceipts(auth.tenantId);
    body = isExcel ? await createPurchaseWorkbook(receipts) : await createPurchasePdf(receipts, generatedAt);
    label = "Purchases";
  }
  return downloadResponse(body, isExcel ? XLSX_CONTENT_TYPE : PDF_CONTENT_TYPE, `X-Nail-${label}-${dateStamp(generatedAt)}.${format}`);
}

export type InventoryUpload = { readonly filename: string; readonly contentType: string; readonly bytes: Uint8Array };

function validateUpload(upload: InventoryUpload): string | null {
  if (!upload.filename.toLowerCase().endsWith(".xlsx")) return "Only .xlsx files are accepted.";
  if (upload.bytes.byteLength > INVENTORY_MAX_UPLOAD_BYTES) return "File exceeds the 5 MB upload limit.";
  if (upload.bytes.byteLength === 0) return "The uploaded file is empty.";
  const allowedTypes = new Set(["", "application/octet-stream", XLSX_CONTENT_TYPE]);
  if (!allowedTypes.has(upload.contentType.toLowerCase())) return "The uploaded file type is not supported.";
  return null;
}

async function previewUpload(services: InventoryTransferServices, tenantId: string, upload: InventoryUpload) {
  const uploadError = validateUpload(upload);
  if (uploadError) throw new Error(uploadError);
  const [categories, products] = await Promise.all([services.listCategories(tenantId), services.listProducts(tenantId)]);
  return parseInventoryWorkbook(upload.bytes, categories, products);
}

export async function handleInventoryImportPreview(services: InventoryTransferServices, upload: InventoryUpload): Promise<Response> {
  const auth = await services.authorize("product.write");
  const denied = authResponse(auth);
  if (auth.outcome !== "authorized") return denied ?? Response.json({ error: "Permission denied." }, { status: 403 });
  try {
    const preview = await previewUpload(services, auth.tenantId, upload);
    return Response.json({ filename: upload.filename, preview }, { status: 200, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Workbook validation failed." }, { status: 400 });
  }
}

export async function handleInventoryImportCommit(services: InventoryTransferServices, upload: InventoryUpload): Promise<Response> {
  const auth = await services.authorize("product.write");
  const denied = authResponse(auth);
  if (auth.outcome !== "authorized") return denied ?? Response.json({ error: "Permission denied." }, { status: 403 });
  try {
    const preview = await previewUpload(services, auth.tenantId, upload);
    if (preview.issues.length > 0 || preview.validRows.length === 0) {
      return Response.json({ error: "Import was not applied because the workbook contains invalid rows or no valid rows.", preview }, { status: 422 });
    }
    const imported = await services.importProducts(auth.tenantId, preview.validRows);
    return Response.json({ imported, skipped: preview.skippedRows }, { status: 201, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Inventory import failed." }, { status: 400 });
  }
}