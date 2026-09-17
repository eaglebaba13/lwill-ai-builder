import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { safeSpreadsheetText } from "./data-transfer";

export const INVENTORY_TEMPLATE_VERSION = 1;
export const INVENTORY_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const INVENTORY_MAX_ROWS = 500;
export const INVENTORY_WORKSHEET = "Products";

export type InventoryProduct = {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly sku: string;
  readonly unit: string;
  readonly priceCents: number;
  readonly isActive: boolean;
};

export type InventoryCategory = { readonly id: string; readonly name: string };
export type InventoryStockItem = { readonly productId: string; readonly branchId: string; readonly quantity: number };
export type InventoryBranch = { readonly id: string; readonly name: string };
export type PurchaseExportReceipt = {
  readonly id: string;
  readonly supplierId: string | null;
  readonly warehouseId: string;
  readonly branchId: string;
  readonly receivedBy: string | null;
  readonly receivedAt: string;
  readonly notes: string | null;
  readonly lineItems: readonly { readonly productId: string; readonly quantity: number }[];
};

export type InventoryImportRow = {
  readonly row: number;
  readonly categoryId: string;
  readonly name: string;
  readonly sku: string;
  readonly unit: string;
  readonly priceCents: number;
  readonly isActive: boolean;
};

export type InventoryImportIssue = { readonly row: number; readonly field: string; readonly message: string };
export type InventoryImportPreview = {
  readonly templateVersion: number | null;
  readonly totalRows: number;
  readonly validRows: readonly InventoryImportRow[];
  readonly invalidRows: readonly number[];
  readonly skippedRows: number;
  readonly issues: readonly InventoryImportIssue[];
};

const HEADERS = ["Category ID", "Product Name", "SKU", "Unit", "Selling Price (INR)", "Active"] as const;

function styleHeader(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: `F${Math.max(1, worksheet.rowCount)}` };
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FF17130A" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
  header.alignment = { vertical: "middle" };
  worksheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
}

export async function createInventoryTemplate(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "X Nail";
  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ width: 28 }, { width: 76 }];
  instructions.addRows([
    ["Template Version", INVENTORY_TEMPLATE_VERSION],
    ["Import mode", "CREATE ONLY. Existing SKUs are rejected and no rows are written until confirmation."],
    ["Required worksheet", INVENTORY_WORKSHEET],
    ["Required columns", "Category ID, Product Name, SKU, Selling Price (INR)"],
    ["Optional columns", "Unit (defaults to pcs), Active (defaults to TRUE)"],
    ["Category guidance", "Use an active category ID from the authorized X Nail workspace."],
    ["Money guidance", "Enter INR with at most two decimal places; values must be zero or greater."],
    ["Security", "Formula cells are rejected. Maximum 500 data rows and 5 MB per upload."],
  ]);
  instructions.getColumn(1).font = { bold: true };
  instructions.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  const sheet = workbook.addWorksheet(INVENTORY_WORKSHEET);
  sheet.columns = [
    { header: HEADERS[0], key: "categoryId", width: 38 },
    { header: HEADERS[1], key: "name", width: 30 },
    { header: HEADERS[2], key: "sku", width: 22 },
    { header: HEADERS[3], key: "unit", width: 14 },
    { header: HEADERS[4], key: "price", width: 22 },
    { header: HEADERS[5], key: "active", width: 14 },
  ];
  sheet.addRow({ categoryId: "00000000-0000-0000-0000-000000000000", name: "Example polish", sku: "EXAMPLE-001", unit: "pcs", price: 499, active: true });
  sheet.getColumn("price").numFmt = "₹#,##0.00";
  styleHeader(sheet);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function plainCell(cell: ExcelJS.Cell): unknown {
  if (cell.type === ExcelJS.ValueType.Formula) return Symbol.for("formula");
  return cell.value;
}

function textCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    return "";
  }
  return String(value).trim();
}

function parseMoney(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(textCell(value));
  if (!Number.isFinite(raw) || raw < 0 || Math.round(raw * 100) !== raw * 100) return null;
  return Math.round(raw * 100);
}

function parseActive(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const normalized = textCell(value).toLowerCase();
  if (normalized === "" || normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "active") return true;
  if (normalized === "false" || normalized === "no" || normalized === "0" || normalized === "inactive") return false;
  return null;
}

export async function parseInventoryWorkbook(
  bytes: Uint8Array,
  categories: readonly InventoryCategory[],
  existingProducts: readonly Pick<InventoryProduct, "sku">[],
): Promise<InventoryImportPreview> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new Error("The uploaded file is not a readable XLSX workbook.");
  }
  const versionValue = workbook.getWorksheet("Instructions")?.getCell("B1").value;
  const templateVersion = Number(versionValue);
  if (templateVersion !== INVENTORY_TEMPLATE_VERSION) {
    throw new Error(`Unsupported template version. Expected version ${INVENTORY_TEMPLATE_VERSION}.`);
  }
  const sheet = workbook.getWorksheet(INVENTORY_WORKSHEET);
  if (!sheet) throw new Error(`Required worksheet "${INVENTORY_WORKSHEET}" is missing.`);
  const headers = new Map<string, number>();
  const duplicateHeaders = new Set<string>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    const name = textCell(plainCell(cell));
    if (headers.has(name)) duplicateHeaders.add(name);
    headers.set(name, column);
  });
  if (duplicateHeaders.size > 0) throw new Error(`Duplicate column: ${Array.from(duplicateHeaders).join(", ")}.`);
  const unknown = Array.from(headers.keys()).filter((header) => !HEADERS.includes(header as typeof HEADERS[number]));
  if (unknown.length > 0) throw new Error(`Unknown column: ${unknown.join(", ")}.`);
  for (const required of [HEADERS[0], HEADERS[1], HEADERS[2], HEADERS[4]]) {
    if (!headers.has(required)) throw new Error(`Required column "${required}" is missing.`);
  }
  const dataRowCount = Math.max(0, sheet.actualRowCount - 1);
  if (dataRowCount > INVENTORY_MAX_ROWS) throw new Error(`Workbook exceeds the ${INVENTORY_MAX_ROWS}-row limit.`);

  const categoryIds = new Set(categories.map((category) => category.id));
  const existingSkus = new Set(existingProducts.map((product) => product.sku.trim().toLowerCase()));
  const workbookSkus = new Set<string>();
  const issues: InventoryImportIssue[] = [];
  const validRows: InventoryImportRow[] = [];
  const invalidRows = new Set<number>();
  let skippedRows = 0;
  for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = Object.fromEntries(HEADERS.map((header) => [header, plainCell(row.getCell(headers.get(header) ?? 0))]));
    if (Object.values(values).every((value) => textCell(value) === "")) { skippedRows += 1; continue; }
    const addIssue = (field: string, message: string) => { issues.push({ row: rowNumber, field, message }); invalidRows.add(rowNumber); };
    for (const [header, value] of Object.entries(values)) {
      if (value === Symbol.for("formula")) addIssue(header, "Formula cells are not allowed.");
    }
    const categoryId = textCell(values[HEADERS[0]]);
    const name = textCell(values[HEADERS[1]]);
    const sku = textCell(values[HEADERS[2]]);
    const unit = textCell(values[HEADERS[3]]) || "pcs";
    const priceCents = parseMoney(values[HEADERS[4]]);
    const isActive = parseActive(values[HEADERS[5]]);
    if (!categoryId) addIssue(HEADERS[0], "Category ID is required.");
    else if (!categoryIds.has(categoryId)) addIssue(HEADERS[0], "Category does not exist in the authorized tenant scope.");
    if (!name) addIssue(HEADERS[1], "Product name is required.");
    if (!sku) addIssue(HEADERS[2], "SKU is required.");
    const normalizedSku = sku.toLowerCase();
    if (sku && existingSkus.has(normalizedSku)) addIssue(HEADERS[2], "SKU already exists.");
    if (sku && workbookSkus.has(normalizedSku)) addIssue(HEADERS[2], "SKU is duplicated in this workbook.");
    if (sku) workbookSkus.add(normalizedSku);
    if (!unit) addIssue(HEADERS[3], "Unit is required.");
    if (priceCents === null) addIssue(HEADERS[4], "Selling price must be zero or greater with at most two decimal places.");
    if (isActive === null) addIssue(HEADERS[5], "Active must be TRUE or FALSE.");
    if (!invalidRows.has(rowNumber)) validRows.push({ row: rowNumber, categoryId, name, sku, unit, priceCents: priceCents as number, isActive: isActive as boolean });
  }
  return { templateVersion, totalRows: validRows.length + invalidRows.size, validRows, invalidRows: Array.from(invalidRows), skippedRows, issues };
}

export async function createInventoryWorkbook(args: {
  products: readonly InventoryProduct[];
  categories: readonly InventoryCategory[];
  stockItems: readonly InventoryStockItem[];
  branches: readonly InventoryBranch[];
}): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "X Nail";
  const sheet = workbook.addWorksheet("Inventory Register");
  sheet.columns = [
    { header: "Product ID", key: "id", width: 38 }, { header: "Product", key: "name", width: 28 },
    { header: "SKU", key: "sku", width: 20 }, { header: "Category", key: "category", width: 22 },
    { header: "Unit", key: "unit", width: 12 }, { header: "Selling Price (INR)", key: "price", width: 20 },
    { header: "Active", key: "active", width: 12 }, { header: "Branch", key: "branch", width: 24 },
    { header: "Quantity", key: "quantity", width: 14 },
  ];
  const categoryMap = new Map(args.categories.map((item) => [item.id, item.name]));
  const branchMap = new Map(args.branches.map((item) => [item.id, item.name]));
  for (const product of args.products) {
    const balances = args.stockItems.filter((item) => item.productId === product.id);
    const rows = balances.length > 0 ? balances : [{ productId: product.id, branchId: "", quantity: 0 }];
    for (const balance of rows) sheet.addRow({ id: safeSpreadsheetText(product.id), name: safeSpreadsheetText(product.name), sku: safeSpreadsheetText(product.sku), category: safeSpreadsheetText(categoryMap.get(product.categoryId) ?? product.categoryId), unit: safeSpreadsheetText(product.unit), price: product.priceCents / 100, active: product.isActive ? "Active" : "Inactive", branch: safeSpreadsheetText(branchMap.get(balance.branchId) ?? balance.branchId), quantity: balance.quantity });
  }
  sheet.getColumn("price").numFmt = "₹#,##0.00";
  styleHeader(sheet);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function createPurchaseWorkbook(receipts: readonly PurchaseExportReceipt[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "X Nail";
  const sheet = workbook.addWorksheet("Purchase Register");
  sheet.columns = [
    { header: "Receipt ID", key: "id", width: 38 }, { header: "Received At", key: "receivedAt", width: 22 },
    { header: "Supplier ID", key: "supplierId", width: 38 }, { header: "Warehouse ID", key: "warehouseId", width: 38 },
    { header: "Branch ID", key: "branchId", width: 38 }, { header: "Received By", key: "receivedBy", width: 22 },
    { header: "Line Items", key: "itemCount", width: 14 }, { header: "Total Quantity", key: "quantity", width: 16 },
    { header: "Notes", key: "notes", width: 32 },
  ];
  for (const receipt of receipts) sheet.addRow({ id: safeSpreadsheetText(receipt.id), receivedAt: new Date(receipt.receivedAt), supplierId: safeSpreadsheetText(receipt.supplierId), warehouseId: safeSpreadsheetText(receipt.warehouseId), branchId: safeSpreadsheetText(receipt.branchId), receivedBy: safeSpreadsheetText(receipt.receivedBy), itemCount: receipt.lineItems.length, quantity: receipt.lineItems.reduce((sum, item) => sum + item.quantity, 0), notes: safeSpreadsheetText(receipt.notes) });
  sheet.getColumn("receivedAt").numFmt = "dd-mmm-yyyy hh:mm";
  styleHeader(sheet);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

function collectPdf(title: string, build: (document: PDFKit.PDFDocument, generatedAt: Date) => void, generatedAt = new Date()): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 42, info: { Title: `X Nail ${title}`, Author: "X Nail" } });
    const chunks: Buffer[] = [];
    let page = 1;
    const header = () => { document.fontSize(9).fillColor("#8F6F1B").text("X NAIL", { characterSpacing: 1 }); document.fontSize(17).fillColor("#17130A").text(title); document.fontSize(8).fillColor("#666666").text(`Generated ${generatedAt.toISOString()}  |  Page ${page}`); document.moveDown(0.6); };
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.on("error", reject);
    document.on("pageAdded", () => { page += 1; header(); });
    header(); build(document, generatedAt); document.end();
  });
}

function ensureSpace(document: PDFKit.PDFDocument, height = 40) { if (document.y + height > 780) document.addPage(); }

export function createInventoryPdf(args: { products: readonly InventoryProduct[]; categories: readonly InventoryCategory[]; stockItems: readonly InventoryStockItem[]; branches: readonly InventoryBranch[] }, generatedAt = new Date()): Promise<Uint8Array> {
  return collectPdf("Inventory Register", (document) => {
    const categories = new Map(args.categories.map((item) => [item.id, item.name]));
    const branches = new Map(args.branches.map((item) => [item.id, item.name]));
    for (const product of args.products) {
      ensureSpace(document, 46);
      const balances = args.stockItems.filter((item) => item.productId === product.id);
      document.fontSize(9).fillColor("#17130A").text(`${product.name}  |  ${product.sku}`);
      document.fontSize(8).fillColor("#555555").text(`${categories.get(product.categoryId) ?? product.categoryId}  |  ${product.unit}  |  INR ${(product.priceCents / 100).toFixed(2)}  |  ${product.isActive ? "Active" : "Inactive"}`);
      document.text(balances.length ? balances.map((item) => `${branches.get(item.branchId) ?? item.branchId}: ${item.quantity}`).join("   ") : "No branch stock record");
      document.moveDown(0.55);
    }
    if (!args.products.length) document.fontSize(10).fillColor("#666666").text("No products in the current authorized scope.");
  }, generatedAt);
}

export function createPurchasePdf(receipts: readonly PurchaseExportReceipt[], generatedAt = new Date()): Promise<Uint8Array> {
  return collectPdf("Purchase Receipt Register", (document) => {
    for (const receipt of receipts) {
      ensureSpace(document, 48);
      document.fontSize(9).fillColor("#17130A").text(`Receipt ${receipt.id}`);
      document.fontSize(8).fillColor("#555555").text(`${new Date(receipt.receivedAt).toISOString()}  |  Branch ${receipt.branchId}  |  Warehouse ${receipt.warehouseId}`);
      document.text(`Supplier: ${receipt.supplierId ?? "Not assigned"}  |  Items: ${receipt.lineItems.length}  |  Quantity: ${receipt.lineItems.reduce((sum, item) => sum + item.quantity, 0)}`);
      if (receipt.notes) document.text(`Notes: ${receipt.notes}`);
      document.moveDown(0.55);
    }
    if (!receipts.length) document.fontSize(10).fillColor("#666666").text("No purchase receipts in the current authorized scope.");
  }, generatedAt);
}