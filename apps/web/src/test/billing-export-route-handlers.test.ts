import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import {
  handleBillingExport,
  type BillingExportAuthorization,
  type BillingExportServices,
} from "../lib/x-nail/billing-export-route-handlers";

const invoices = [{
  id: "invoice-1",
  customerId: "customer-1",
  branchId: "branch-1",
  issuedAt: "2026-09-17T10:00:00.000Z",
  subtotalCents: 12000,
  discountCents: 1000,
  gstCents: 1980,
  totalCents: 12980,
  notes: "=unsafe",
  payments: [{
    id: "payment-1",
    invoiceId: "invoice-1",
    amountCents: 5000,
    method: "offline",
    paidAt: "2026-09-17T11:00:00.000Z",
    notes: null,
  }],
}] as const;

function services(authorization: BillingExportAuthorization): BillingExportServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listBillingData: vi.fn().mockResolvedValue(invoices),
  };
}

describe("billing export route handler", () => {
  it("rejects unauthenticated exports", async () => {
    const fixture = services({ outcome: "unauthenticated" });
    const response = await handleBillingExport(fixture, "invoices", "xlsx");
    expect(response.status).toBe(401);
    expect(fixture.listBillingData).not.toHaveBeenCalled();
  });

  it("rejects unauthorized exports", async () => {
    const fixture = services({ outcome: "forbidden" });
    const response = await handleBillingExport(fixture, "invoices", "pdf");
    expect(response.status).toBe(403);
    expect(fixture.listBillingData).not.toHaveBeenCalled();
  });

  it("loads only the server-authorized tenant scope", async () => {
    const fixture = services({ outcome: "authorized", tenantId: "tenant-1" });
    await handleBillingExport(fixture, "invoices", "xlsx");
    expect(fixture.listBillingData).toHaveBeenCalledWith("tenant-1");
  });

  it("returns a genuine invoice workbook with correct headers and money values", async () => {
    const response = await handleBillingExport(
      services({ outcome: "authorized", tenantId: "tenant-1" }),
      "invoices",
      "xlsx",
      new Date("2026-09-17T12:00:00.000Z"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toContain("X-Nail-Invoices-2026-09-17.xlsx");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 2))).toBe("PK");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const worksheet = workbook.getWorksheet("Invoice Register");
    expect(worksheet?.getRow(1).values).toEqual([
      undefined,
      "Invoice ID",
      "Customer ID",
      "Branch ID",
      "Issued At",
      "Subtotal (INR)",
      "Discount (INR)",
      "GST (INR)",
      "Total (INR)",
      "Paid (INR)",
      "Balance (INR)",
      "Payment Status",
      "Notes",
    ]);
    expect(worksheet?.getRow(2).getCell(8).value).toBe(129.8);
    expect(worksheet?.getRow(2).getCell(9).value).toBe(50);
    expect(worksheet?.getRow(2).getCell(10).value).toBe(79.8);
    expect(worksheet?.getRow(2).getCell(12).value).toBe("'=unsafe");
  });

  it("returns a genuine payment workbook", async () => {
    const response = await handleBillingExport(
      services({ outcome: "authorized", tenantId: "tenant-1" }),
      "payments",
      "xlsx",
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const worksheet = workbook.getWorksheet("Payment Register");
    expect(worksheet?.getRow(1).getCell(5).value).toBe("Amount (INR)");
    expect(worksheet?.getRow(2).getCell(5).value).toBe(50);
  });

  it.each(["invoices", "payments"] as const)("returns valid PDF output for %s", async (dataset) => {
    const response = await handleBillingExport(
      services({ outcome: "authorized", tenantId: "tenant-1" }),
      dataset,
      "pdf",
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
    const signature = new TextDecoder().decode((await response.arrayBuffer()).slice(0, 5));
    expect(signature).toBe("%PDF-");
  });
});
