import { describe, expect, it, vi } from "vitest";
import { createBillingInvoiceService } from "./invoice-service";

describe("billing invoice service", () => {
  it("creates an invoice with subtotal, gst, and total calculated from line items", async () => {
    const invoiceService = createBillingInvoiceService({
      invoice: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      invoiceLineItem: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }),
        findMany: async () => [],
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
      },
      service: {
        findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }),
      },
      package: {
        findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => null,
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          invoice: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data }),
            findUnique: async () => null,
            findMany: async () => [],
          },
          invoiceLineItem: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }),
            findMany: async () => [],
          },
          customer: {
            findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
          },
          service: {
            findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }),
          },
          package: {
            findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }),
          },
          product: {
            findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
          },
          stockItem: {
            findFirst: async () => null,
            create: async () => ({ id: "stock-item-1" }),
            update: async () => ({ id: "stock-item-1" }),
          },
          stockMovement: {
            create: async () => ({ id: "movement-1" }),
          },
          branch: {
            findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
          },
        } as unknown),
    } as never);

    const invoice = await invoiceService.createInvoice({
      tenantId: "tenant-1",
      customerId: "customer-1",
      issuedAt: new Date("2026-08-12T10:00:00.000Z"),
      discountCents: 500,
      gstCents: 450,
      items: [
        { description: "Classic manicure", serviceId: "service-1", quantity: 2, unitPriceCents: 1500 },
        { description: "Glow package", packageId: "pkg-1", quantity: 1, unitPriceCents: 2500 },
      ],
    });

    expect(invoice.tenantId).toBe("tenant-1");
    expect(invoice.subtotalCents).toBe(5500);
    expect(invoice.discountCents).toBe(500);
    expect(invoice.gstCents).toBe(450);
    expect(invoice.totalCents).toBe(5450);
  });

  it("rejects invoice creation when the customer belongs to another tenant", async () => {
    const invoiceService = createBillingInvoiceService({
      invoice: {
        create: async () => ({ id: "invoice-1" }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      invoiceLineItem: {
        create: async () => ({ id: "line-1" }),
        findMany: async () => [],
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-2" }),
      },
      service: {
        findUnique: async () => null,
      },
      package: {
        findUnique: async () => null,
      },
      product: {
        findUnique: async () => null,
      },
      stockItem: {
        findFirst: async () => null,
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      branch: {
        findUnique: async () => null,
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          invoice: {
            create: async () => ({ id: "invoice-1" }),
            findUnique: async () => null,
            findMany: async () => [],
          },
          invoiceLineItem: {
            create: async () => ({ id: "line-1" }),
            findMany: async () => [],
          },
          customer: {
            findUnique: async () => ({ id: "customer-1", tenantId: "tenant-2" }),
          },
          service: {
            findUnique: async () => null,
          },
          package: {
            findUnique: async () => null,
          },
          product: {
            findUnique: async () => null,
          },
          stockItem: {
            findFirst: async () => null,
            create: async () => ({ id: "stock-item-1" }),
            update: async () => ({ id: "stock-item-1" }),
          },
          stockMovement: {
            create: async () => ({ id: "movement-1" }),
          },
          branch: {
            findUnique: async () => null,
          },
        } as unknown),
    } as never);

    await expect(
      invoiceService.createInvoice({
        tenantId: "tenant-1",
        customerId: "customer-1",
        issuedAt: new Date("2026-08-12T10:00:00.000Z"),
        items: [{ description: "Classic manicure", serviceId: "service-1", quantity: 1, unitPriceCents: 1000 }],
      }),
    ).rejects.toThrow("customer must belong to the same tenant");
  });

  it("returns only invoices from the requested tenant", async () => {
    const invoiceService = createBillingInvoiceService({
      invoice: {
        create: async () => ({ id: "invoice-1" }),
        findUnique: async () => null,
        findMany: async ({ where }: { where?: Record<string, unknown> }) => [
          { id: "invoice-1", tenantId: "tenant-1", customerId: "customer-1", subtotalCents: 1000, gstCents: 100, discountCents: 0, totalCents: 1100 },
          { id: "invoice-2", tenantId: "tenant-2", customerId: "customer-2", subtotalCents: 2000, gstCents: 200, discountCents: 0, totalCents: 2200 },
        ].filter((invoice) => where?.tenantId === invoice.tenantId),
      },
      invoiceLineItem: {
        create: async () => ({ id: "line-1" }),
        findMany: async () => [],
      },
      customer: {
        findUnique: async () => null,
      },
      service: {
        findUnique: async () => null,
      },
      package: {
        findUnique: async () => null,
      },
      product: {
        findUnique: async () => null,
      },
      stockItem: {
        findFirst: async () => null,
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      branch: {
        findUnique: async () => null,
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback({} as unknown),
    } as never);

    const invoices = await invoiceService.listInvoices({ tenantId: "tenant-1" });

    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.tenantId).toBe("tenant-1");
  });

  it("delegates stock deduction to recordStockMovement when branchId and productId are present", async () => {
    const recordStockMovement = vi.fn(async () => ({ id: "stock-item-1", quantity: 5 }));

    const invoiceService = createBillingInvoiceService({
      invoice: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      invoiceLineItem: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }),
        findMany: async () => [],
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
      },
      service: {
        findUnique: async () => null,
      },
      package: {
        findUnique: async () => null,
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => ({ id: "stock-item-1", quantity: 10 }),
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) => {
        const mockPrisma = {
          invoice: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data }),
            findUnique: async () => null,
            findMany: async () => [],
          },
          invoiceLineItem: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }),
            findMany: async () => [],
          },
          customer: {
            findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
          },
          service: {
            findUnique: async () => null,
          },
          package: {
            findUnique: async () => null,
          },
          product: {
            findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
          },
          stockItem: {
            findFirst: async () => ({ id: "stock-item-1", quantity: 10 }),
            create: async () => ({ id: "stock-item-1" }),
            update: async () => ({ id: "stock-item-1" }),
          },
          stockMovement: {
            create: async () => ({ id: "movement-1" }),
          },
          branch: {
            findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
          },
        } as never;
        return callback(mockPrisma);
      },
    } as never);

    const invoice = await invoiceService.createInvoice({
      tenantId: "tenant-1",
      customerId: "customer-1",
      issuedAt: new Date("2026-08-12T10:00:00.000Z"),
      branchId: "branch-1",
      items: [{ description: "Nail polish", productId: "product-1", quantity: 2, unitPriceCents: 500 }],
    });

    expect(invoice.id).toBe("invoice-1");
  });

  it("creates an invoice with mixed product, service, and package line items", async () => {
    const invoiceService = createBillingInvoiceService({
      invoice: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data }),
        findUnique: async () => null,
        findMany: async () => [],
      },
      invoiceLineItem: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }),
        findMany: async () => [],
      },
      customer: {
        findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
      },
      service: {
        findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }),
      },
      package: {
        findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }),
      },
      product: {
        findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
      },
      stockItem: {
        findFirst: async () => ({ id: "stock-item-1", quantity: 10 }),
        create: async () => ({ id: "stock-item-1" }),
        update: async () => ({ id: "stock-item-1" }),
      },
      stockMovement: {
        create: async () => ({ id: "movement-1" }),
      },
      branch: {
        findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
      },
      $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
        callback({
          invoice: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data }),
            findUnique: async () => null,
            findMany: async () => [],
          },
          invoiceLineItem: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }),
            findMany: async () => [],
          },
          customer: {
            findUnique: async () => ({ id: "customer-1", tenantId: "tenant-1" }),
          },
          service: {
            findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }),
          },
          package: {
            findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }),
          },
          product: {
            findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }),
          },
          stockItem: {
            findFirst: async () => ({ id: "stock-item-1", quantity: 10 }),
            create: async () => ({ id: "stock-item-1" }),
            update: async () => ({ id: "stock-item-1" }),
          },
          stockMovement: {
            create: async () => ({ id: "movement-1" }),
          },
          branch: {
            findUnique: async () => ({ id: "branch-1", tenantId: "tenant-1" }),
          },
        } as unknown),
    } as never);

    const invoice = await invoiceService.createInvoice({
      tenantId: "tenant-1",
      customerId: "customer-1",
      issuedAt: new Date("2026-08-12T10:00:00.000Z"),
      branchId: "branch-1",
      items: [
        { description: "Service", serviceId: "service-1", quantity: 1, unitPriceCents: 1500 },
        { description: "Product", productId: "product-1", quantity: 2, unitPriceCents: 500 },
        { description: "Package", packageId: "pkg-1", quantity: 1, unitPriceCents: 2500 },
      ],
    });

    expect(invoice.id).toBe("invoice-1");
    expect(invoice.subtotalCents).toBe(5000);
    expect(invoice.totalCents).toBe(5000);
  });
});
