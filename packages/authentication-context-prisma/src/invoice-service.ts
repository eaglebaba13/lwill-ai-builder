import { createStockService, type StockPrismaClient, type StockService } from "./stock-service";

export interface InvoiceLineItemRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly invoiceId: string;
  readonly description: string;
  readonly serviceId: string | null;
  readonly packageId: string | null;
  readonly productId: string | null;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InvoiceLineItemInput {
  readonly description: string;
  readonly serviceId?: string | null;
  readonly packageId?: string | null;
  readonly productId?: string | null;
  readonly quantity: number;
  readonly unitPriceCents: number;
}

export interface InvoiceRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly customerId: string;
  readonly issuedAt: Date;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly gstCents: number;
  readonly totalCents: number;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InvoiceCreateInput {
  readonly tenantId: string;
  readonly customerId: string;
  readonly issuedAt: Date;
  readonly discountCents?: number;
  readonly gstCents?: number;
  readonly notes?: string | null;
  readonly branchId?: string | null;
  readonly items: readonly InvoiceLineItemInput[];
}

export interface InvoiceUpdateInput {
  readonly discountCents?: number;
  readonly notes?: string | null;
}

export interface InvoiceService {
  createInvoice(input: InvoiceCreateInput): Promise<InvoiceRecord>;
  getInvoice(args: { tenantId: string; invoiceId: string }): Promise<InvoiceRecord | null>;
  listInvoices(args: { tenantId: string }): Promise<InvoiceRecord[]>;
  updateInvoice(args: { tenantId: string; invoiceId: string; input: InvoiceUpdateInput }): Promise<InvoiceRecord | null>;
}

interface InvoicePrismaClient {
  readonly invoice: {
    create: (args: { data: Record<string, unknown> }) => Promise<InvoiceRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<InvoiceRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<InvoiceRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<InvoiceRecord>;
  };
  readonly invoiceLineItem: {
    create: (args: { data: Record<string, unknown> }) => Promise<InvoiceLineItemRecord>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<InvoiceLineItemRecord[]>;
  };
  readonly customer: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly service: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly package: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly product: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly stockItem: {
    findFirst: (args: { where: Record<string, unknown> }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<{ id: string }>;
  };
  readonly stockMovement: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  readonly branch: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  $transaction: {
    <T>(callback: (client: InvoicePrismaClient) => Promise<T>): Promise<T>;
  };
}

function calculateTotals(items: readonly InvoiceLineItemInput[], discountCents: number, gstCents: number) {
  const subtotalCents = items.reduce((sum, item) => sum + (item.quantity * item.unitPriceCents), 0);
  const totalCents = subtotalCents - discountCents + gstCents;

  return {
    subtotalCents,
    discountCents,
    gstCents,
    totalCents,
  };
}

export function createBillingInvoiceService(prisma: InvoicePrismaClient): InvoiceService {
  const stockService = createStockService(prisma as never);

  return {
    async createInvoice(input) {
      return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (customer === null || customer.tenantId !== input.tenantId) {
          throw new Error("customer must belong to the same tenant");
        }

        const normalizedItems = input.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPriceCents: Number(item.unitPriceCents),
        }));

        for (const item of normalizedItems) {
          if (item.serviceId) {
            const service = await tx.service.findUnique({ where: { id: item.serviceId } });
            if (service === null || service.tenantId !== input.tenantId) {
              throw new Error("service must belong to the same tenant");
            }
          }

          if (item.packageId) {
            const pkg = await tx.package.findUnique({ where: { id: item.packageId } });
            if (pkg === null || pkg.tenantId !== input.tenantId) {
              throw new Error("package must belong to the same tenant");
            }
          }

          if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product === null || product.tenantId !== input.tenantId) {
              throw new Error("product must belong to the same tenant");
            }
          }
        }

        const discountCents = input.discountCents ?? 0;
        const gstCents = input.gstCents ?? 0;
        const totals = calculateTotals(normalizedItems, discountCents, gstCents);

        const invoice = await tx.invoice.create({
          data: {
            tenantId: input.tenantId,
            customerId: input.customerId,
            issuedAt: input.issuedAt,
            subtotalCents: totals.subtotalCents,
            discountCents: totals.discountCents,
            gstCents: totals.gstCents,
            totalCents: totals.totalCents,
            notes: input.notes ?? null,
          },
        });

        for (const item of normalizedItems) {
          const lineTotalCents = item.quantity * item.unitPriceCents;
          await tx.invoiceLineItem.create({
            data: {
              tenantId: input.tenantId,
              invoiceId: invoice.id,
              description: item.description,
              serviceId: item.serviceId ?? null,
              packageId: item.packageId ?? null,
              productId: item.productId ?? null,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              lineTotalCents,
            },
          });
        }

        if (input.branchId) {
          const branch = await tx.branch.findUnique({ where: { id: input.branchId } });
          if (branch === null || branch.tenantId !== input.tenantId) {
            throw new Error("branch must belong to the same tenant");
          }

          for (const item of normalizedItems) {
            if (!item.productId) {
              continue;
            }

            await stockService.recordStockMovement(
              {
                tenantId: input.tenantId,
                productId: item.productId,
                branchId: input.branchId,
                movementType: "SALE",
                quantity: item.quantity,
                referenceType: "INVOICE",
                referenceId: invoice.id,
                notes: `Stock deducted for invoice ${invoice.id}`,
              },
              tx as unknown as StockPrismaClient,
            );
          }
        }

        return invoice;
      });
    },
    async getInvoice({ tenantId, invoiceId }) {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice === null || invoice.tenantId !== tenantId) {
        return null;
      }
      return invoice;
    },
    async listInvoices(args: { tenantId: string }) {
      return prisma.invoice.findMany({ where: { tenantId: args.tenantId } });
    },

    async updateInvoice({ tenantId, invoiceId, input }) {
      const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }

      const record = existing as InvoiceRecord;
      const data: Record<string, unknown> = {};
      if (input.discountCents !== undefined) {
        data.discountCents = Math.max(0, input.discountCents);
        data.totalCents = record.subtotalCents - (data.discountCents as number) + record.gstCents;
      }
      if (input.notes !== undefined) {
        data.notes = input.notes;
      }

      return prisma.invoice.update({ where: { id: invoiceId }, data });
    },
  };
}
