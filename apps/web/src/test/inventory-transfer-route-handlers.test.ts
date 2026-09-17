import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import {
  handleInventoryExport,
  handleInventoryImportCommit,
  handleInventoryImportPreview,
  handleInventoryTemplate,
  type InventoryTransferAuthorization,
  type InventoryTransferServices,
} from "@/lib/x-nail/inventory-transfer-route-handlers";
import { createInventoryTemplate, INVENTORY_MAX_ROWS } from "@/lib/x-nail/inventory-transfer";

const category = { id: "11111111-1111-1111-1111-111111111111", name: "Retail" };
const product = { id: "product-1", categoryId: category.id, name: "=Formula polish", sku: "+SKU-1", unit: "pcs", priceCents: 49900, isActive: true };

function services(overrides: Partial<InventoryTransferServices> = {}): InventoryTransferServices {
  return {
    authorize: vi.fn(async (): Promise<InventoryTransferAuthorization> => ({ outcome: "authorized", tenantId: "tenant-1" })),
    listProducts: vi.fn(async () => [product]),
    listCategories: vi.fn(async () => [category]),
    listStockItems: vi.fn(async () => [{ productId: product.id, branchId: "branch-1", quantity: 7 }]),
    listBranches: vi.fn(async () => [{ id: "branch-1", name: "Main studio" }]),
    listPurchaseReceipts: vi.fn(async () => [{ id: "receipt-1", supplierId: "supplier-1", warehouseId: "warehouse-1", branchId: "branch-1", receivedBy: "Manager", receivedAt: "2026-09-17T08:00:00.000Z", notes: "@note", lineItems: [{ productId: product.id, quantity: 3 }] }]),
    importProducts: vi.fn(async (_tenantId, rows) => rows.length),
    ...overrides,
  };
}

async function workbookUpload(mutate?: (workbook: ExcelJS.Workbook) => void) {
  const template = await createInventoryTemplate();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet("Products")!;
  sheet.spliceRows(2, 1);
  sheet.addRow([category.id, "Classic red", "RED-001", "pcs", 499, true]);
  mutate?.(workbook);
  return { filename: "inventory.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: new Uint8Array(await workbook.xlsx.writeBuffer()) };
}

describe("inventory transfer handlers", () => {
  it("rejects unauthenticated exports", async () => {
    const response = await handleInventoryExport(services({ authorize: vi.fn(async (): Promise<InventoryTransferAuthorization> => ({ outcome: "unauthenticated" })) }), "inventory", "xlsx");
    expect(response.status).toBe(401);
  });

  it("rejects forbidden exports", async () => {
    const response = await handleInventoryExport(services({ authorize: vi.fn(async (): Promise<InventoryTransferAuthorization> => ({ outcome: "forbidden" })) }), "purchases", "pdf");
    expect(response.status).toBe(403);
  });

  it("returns a genuine versioned XLSX template with hardened headers", async () => {
    const response = await handleInventoryTemplate(services());
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(response.headers.get("content-type")).toContain("spreadsheetml");
    expect(response.headers.get("content-disposition")).toContain("X-Nail-Inventory-Template.xlsx");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("exports formula-safe inventory cells as genuine XLSX", async () => {
    const response = await handleInventoryExport(services(), "inventory", "xlsx", new Date("2026-09-17T00:00:00Z"));
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const row = workbook.getWorksheet("Inventory Register")!.getRow(2);
    expect(row.getCell(2).value).toBe("'=Formula polish");
    expect(row.getCell(3).value).toBe("'+SKU-1");
  });

  it("exports a genuine purchase PDF", async () => {
    const response = await handleInventoryExport(services(), "purchases", "pdf");
    expect(new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });

  it("rejects malformed workbooks", async () => {
    const response = await handleInventoryImportPreview(services(), { filename: "bad.xlsx", contentType: "application/octet-stream", bytes: new TextEncoder().encode("not xlsx") });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("readable XLSX") });
  });

  it("rejects unsupported template versions", async () => {
    const upload = await workbookUpload((workbook) => { workbook.getWorksheet("Instructions")!.getCell("B1").value = 2; });
    const response = await handleInventoryImportPreview(services(), upload);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("Unsupported template version") });
  });

  it("rejects missing required columns", async () => {
    const upload = await workbookUpload((workbook) => { workbook.getWorksheet("Products")!.getCell("C1").value = "Wrong"; });
    const response = await handleInventoryImportPreview(services(), upload);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("Unknown column") });
  });

  it("reports invalid money and unauthorized categories by row", async () => {
    const upload = await workbookUpload((workbook) => { const row = workbook.getWorksheet("Products")!.getRow(2); row.getCell(1).value = "other-tenant"; row.getCell(5).value = -1; });
    const response = await handleInventoryImportPreview(services({ listProducts: vi.fn(async () => []) }), upload);
    const body = await response.json() as { preview: { issues: Array<{ field: string }> } };
    expect(response.status).toBe(200);
    expect(body.preview.issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(["Category ID", "Selling Price (INR)"]));
  });

  it("reports existing and workbook-duplicate SKUs", async () => {
    const upload = await workbookUpload((workbook) => { workbook.getWorksheet("Products")!.addRow([category.id, "Second", "RED-001", "pcs", 200, true]); });
    const response = await handleInventoryImportPreview(services({ listProducts: vi.fn(async () => [{ ...product, sku: "red-001" }]) }), upload);
    const body = await response.json() as { preview: { issues: Array<{ message: string }> } };
    expect(body.preview.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["SKU already exists.", "SKU is duplicated in this workbook."]));
  });

  it("rejects formula cells without evaluating them", async () => {
    const upload = await workbookUpload((workbook) => { workbook.getWorksheet("Products")!.getRow(2).getCell(2).value = { formula: '1+1', result: "Unsafe" }; });
    const response = await handleInventoryImportPreview(services({ listProducts: vi.fn(async () => []) }), upload);
    const body = await response.json() as { preview: { issues: Array<{ message: string }> } };
    expect(body.preview.issues.some((issue) => issue.message === "Formula cells are not allowed.")).toBe(true);
  });

  it("enforces the workbook row limit", async () => {
    const upload = await workbookUpload((workbook) => { const sheet = workbook.getWorksheet("Products")!; for (let index = 1; index <= INVENTORY_MAX_ROWS; index += 1) sheet.addRow([category.id, `Product ${index}`, `SKU-${index}`, "pcs", 1, true]); });
    const response = await handleInventoryImportPreview(services({ listProducts: vi.fn(async () => []) }), upload);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("row limit") });
  });

  it("requires write permission for preview and commit", async () => {
    const upload = await workbookUpload();
    const denied = services({ authorize: vi.fn(async (): Promise<InventoryTransferAuthorization> => ({ outcome: "forbidden" })) });
    expect((await handleInventoryImportPreview(denied, upload)).status).toBe(403);
    expect((await handleInventoryImportCommit(denied, upload)).status).toBe(403);
  });

  it("commits valid rows through the authorized import service", async () => {
    const upload = await workbookUpload();
    const importProducts = vi.fn(async () => 1);
    const scoped = services({ listProducts: vi.fn(async () => []), importProducts });
    const response = await handleInventoryImportCommit(scoped, upload);
    expect(response.status).toBe(201);
    expect(importProducts).toHaveBeenCalledWith("tenant-1", [expect.objectContaining({ sku: "RED-001", categoryId: category.id, priceCents: 49900 })]);
  });

  it("does not partially import a workbook with invalid rows", async () => {
    const upload = await workbookUpload((workbook) => { workbook.getWorksheet("Products")!.addRow([category.id, "Broken", "", "pcs", 100, true]); });
    const importProducts = vi.fn(async () => 1);
    const response = await handleInventoryImportCommit(services({ listProducts: vi.fn(async () => []), importProducts }), upload);
    expect(response.status).toBe(422);
    expect(importProducts).not.toHaveBeenCalled();
  });
});