export interface PaymentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly invoiceId: string;
  readonly amountCents: number;
  readonly method: string;
  readonly paidAt: Date;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PaymentCreateInput {
  readonly invoiceId: string;
  readonly amountCents: number;
  readonly method?: string;
  readonly paidAt?: Date;
  readonly notes?: string | null;
}

export interface PaymentService {
  createPayment(tenantId: string, input: PaymentCreateInput): Promise<PaymentRecord>;
  listPaymentsForInvoice(tenantId: string, invoiceId: string): Promise<readonly PaymentRecord[]>;
  getPaymentTotal(tenantId: string, invoiceId: string): Promise<number>;
}

interface PaymentPrismaClient {
  readonly payment: {
    create: (args: { data: Record<string, unknown> }) => Promise<PaymentRecord>;
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<PaymentRecord[]>;
    aggregate: (args: { where: Record<string, unknown>; _sum: { amountCents: true } }) => Promise<{ _sum: { amountCents: number | null } }>;
  };
  readonly invoice: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createPaymentService(prisma: PaymentPrismaClient): PaymentService {
  return {
    async createPayment(tenantId, input) {
      const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
      if (invoice === null || invoice.tenantId !== tenantId) {
        throw new Error("invoice must belong to the same tenant");
      }
      if (input.amountCents <= 0) {
        throw new Error("amount must be positive");
      }

      return prisma.payment.create({
        data: {
          tenantId,
          invoiceId: input.invoiceId,
          amountCents: input.amountCents,
          method: input.method ?? "offline",
          paidAt: input.paidAt ?? new Date(),
          notes: input.notes ?? null,
        },
      });
    },

    async listPaymentsForInvoice(tenantId, invoiceId) {
      return prisma.payment.findMany({
        where: { tenantId, invoiceId },
        orderBy: { paidAt: "desc" },
      });
    },

    async getPaymentTotal(tenantId, invoiceId) {
      const result = await prisma.payment.aggregate({
        where: { tenantId, invoiceId },
        _sum: { amountCents: true },
      });
      return result._sum.amountCents ?? 0;
    },
  };
}
