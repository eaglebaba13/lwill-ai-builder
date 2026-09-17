import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { safeSpreadsheetText } from "./data-transfer";

export type BillingExportInvoice = {
  readonly id: string;
  readonly customerId: string;
  readonly branchId: string | null;
  readonly issuedAt: string;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly gstCents: number;
  readonly totalCents: number;
  readonly notes: string | null;
  readonly payments: readonly BillingExportPayment[];
};

export type BillingExportPayment = {
  readonly id: string;
  readonly invoiceId: string;
  readonly amountCents: number;
  readonly method: string;
  readonly paidAt: string;
  readonly notes: string | null;
};

function rupees(cents: number): number {
  return cents / 100;
}

function paymentTotal(invoice: BillingExportInvoice): number {
  return invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
}

function paymentStatus(invoice: BillingExportInvoice): string {
  const paidCents = paymentTotal(invoice);
  if (paidCents >= invoice.totalCents) return "Paid";
  if (paidCents > 0) return "Partially paid";
  return "Open";
}

function styleWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: worksheet.getRow(1).getCell(worksheet.columnCount).address };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FF17130A" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  worksheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
}

export async function createInvoiceWorkbook(invoices: readonly BillingExportInvoice[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "X Nail";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Invoice Register");
  worksheet.columns = [
    { header: "Invoice ID", key: "id", width: 38 },
    { header: "Customer ID", key: "customerId", width: 38 },
    { header: "Branch ID", key: "branchId", width: 38 },
    { header: "Issued At", key: "issuedAt", width: 22 },
    { header: "Subtotal (INR)", key: "subtotal", width: 16 },
    { header: "Discount (INR)", key: "discount", width: 16 },
    { header: "GST (INR)", key: "gst", width: 14 },
    { header: "Total (INR)", key: "total", width: 16 },
    { header: "Paid (INR)", key: "paid", width: 16 },
    { header: "Balance (INR)", key: "balance", width: 16 },
    { header: "Payment Status", key: "status", width: 18 },
    { header: "Notes", key: "notes", width: 32 },
  ];
  for (const invoice of invoices) {
    const paidCents = paymentTotal(invoice);
    worksheet.addRow({
      id: safeSpreadsheetText(invoice.id),
      customerId: safeSpreadsheetText(invoice.customerId),
      branchId: safeSpreadsheetText(invoice.branchId),
      issuedAt: new Date(invoice.issuedAt),
      subtotal: rupees(invoice.subtotalCents),
      discount: rupees(invoice.discountCents),
      gst: rupees(invoice.gstCents),
      total: rupees(invoice.totalCents),
      paid: rupees(paidCents),
      balance: rupees(Math.max(0, invoice.totalCents - paidCents)),
      status: paymentStatus(invoice),
      notes: safeSpreadsheetText(invoice.notes),
    });
  }
  worksheet.getColumn("issuedAt").numFmt = "dd-mmm-yyyy hh:mm";
  for (const key of ["subtotal", "discount", "gst", "total", "paid", "balance"]) {
    worksheet.getColumn(key).numFmt = "₹#,##0.00";
  }
  styleWorksheet(worksheet);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export async function createPaymentWorkbook(invoices: readonly BillingExportInvoice[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "X Nail";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Payment Register");
  worksheet.columns = [
    { header: "Payment ID", key: "id", width: 38 },
    { header: "Invoice ID", key: "invoiceId", width: 38 },
    { header: "Customer ID", key: "customerId", width: 38 },
    { header: "Paid At", key: "paidAt", width: 22 },
    { header: "Amount (INR)", key: "amount", width: 16 },
    { header: "Method", key: "method", width: 16 },
    { header: "Notes", key: "notes", width: 32 },
  ];
  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      worksheet.addRow({
        id: safeSpreadsheetText(payment.id),
        invoiceId: safeSpreadsheetText(payment.invoiceId),
        customerId: safeSpreadsheetText(invoice.customerId),
        paidAt: new Date(payment.paidAt),
        amount: rupees(payment.amountCents),
        method: safeSpreadsheetText(payment.method),
        notes: safeSpreadsheetText(payment.notes),
      });
    }
  }
  worksheet.getColumn("paidAt").numFmt = "dd-mmm-yyyy hh:mm";
  worksheet.getColumn("amount").numFmt = "₹#,##0.00";
  styleWorksheet(worksheet);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function collectPdf(build: (document: PDFKit.PDFDocument) => void): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 42, info: { Title: "X Nail Billing Export", Author: "X Nail" } });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.on("error", reject);
    build(document);
    document.end();
  });
}

function pdfHeader(document: PDFKit.PDFDocument, title: string, generatedAt: Date) {
  document.fontSize(10).fillColor("#8F6F1B").text("X NAIL", { characterSpacing: 1.2 });
  document.fontSize(18).fillColor("#17130A").text(title);
  document.moveDown(0.2).fontSize(8).fillColor("#666666").text(`Generated ${generatedAt.toISOString()}`);
  document.moveDown(0.8).strokeColor("#D4AF37").moveTo(42, document.y).lineTo(553, document.y).stroke();
  document.moveDown(0.7);
}

function ensurePdfSpace(document: PDFKit.PDFDocument, title: string, generatedAt: Date, height = 48) {
  if (document.y + height <= 780) return;
  document.addPage();
  pdfHeader(document, title, generatedAt);
}

export function createInvoicePdf(invoices: readonly BillingExportInvoice[], generatedAt = new Date()): Promise<Uint8Array> {
  return collectPdf((document) => {
    const title = "Invoice Register";
    pdfHeader(document, title, generatedAt);
    invoices.forEach((invoice) => {
      ensurePdfSpace(document, title, generatedAt, 62);
      const paidCents = paymentTotal(invoice);
      document.fontSize(9).fillColor("#17130A").text(`Invoice ${invoice.id}`, { continued: true });
      document.fillColor("#666666").text(`   ${new Date(invoice.issuedAt).toISOString()}`);
      document.fontSize(8).fillColor("#444444").text(`Customer: ${invoice.customerId}   Branch: ${invoice.branchId ?? "Not attributed"}`);
      document.text(`Subtotal: INR ${rupees(invoice.subtotalCents).toFixed(2)}   Discount: INR ${rupees(invoice.discountCents).toFixed(2)}   GST: INR ${rupees(invoice.gstCents).toFixed(2)}`);
      document.fontSize(9).fillColor("#17130A").text(`Total: INR ${rupees(invoice.totalCents).toFixed(2)}   Paid: INR ${rupees(paidCents).toFixed(2)}   Balance: INR ${rupees(Math.max(0, invoice.totalCents - paidCents)).toFixed(2)}   ${paymentStatus(invoice)}`);
      document.moveDown(0.7).strokeColor("#DDDDDD").moveTo(42, document.y).lineTo(553, document.y).stroke().moveDown(0.5);
    });
    if (invoices.length === 0) document.fontSize(10).fillColor("#666666").text("No invoices in the current authorized scope.");
  });
}

export function createPaymentPdf(invoices: readonly BillingExportInvoice[], generatedAt = new Date()): Promise<Uint8Array> {
  return collectPdf((document) => {
    const title = "Payment Register";
    pdfHeader(document, title, generatedAt);
    let count = 0;
    invoices.forEach((invoice) => invoice.payments.forEach((payment) => {
      count += 1;
      ensurePdfSpace(document, title, generatedAt, 46);
      document.fontSize(9).fillColor("#17130A").text(`Payment ${payment.id}`);
      document.fontSize(8).fillColor("#444444").text(`Invoice: ${invoice.id}   Customer: ${invoice.customerId}`);
      document.text(`Paid: ${new Date(payment.paidAt).toISOString()}   Method: ${payment.method}   Amount: INR ${rupees(payment.amountCents).toFixed(2)}`);
      document.moveDown(0.6).strokeColor("#DDDDDD").moveTo(42, document.y).lineTo(553, document.y).stroke().moveDown(0.4);
    }));
    if (count === 0) document.fontSize(10).fillColor("#666666").text("No payments in the current authorized scope.");
  });
}
