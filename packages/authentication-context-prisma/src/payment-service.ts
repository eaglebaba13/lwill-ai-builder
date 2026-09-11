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
  createPayment(tenantId: string, input: PaymentCreateInput, actorUserId: string | null): Promise<PaymentRecord>;
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
  readonly auditLog: {
    create(args: { data: { tenantId: string; actorUserId: string | null; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> } }): Promise<unknown>;
  };
}

function recordAudit(
  prisma: PaymentPrismaClient,
  args: { tenantId: string; actorUserId: string | null; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> },
): void {
  // Best-effort: audit failure must never roll back a committed financial mutation.
  void prisma.auditLog.create({ data: args }).catch(() => {
    // Intentionally swallowed. Audit logging is non-authoritative for financial state.
  });
}

export function createPaymentService(prisma: PaymentPrismaClient): PaymentService {
  return {
    async createPayment(tenantId, input, actorUserId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
      if (invoice === null || invoice.tenantId !== tenantId) {
        throw new Error("invoice must belong to the same tenant");
      }
      if (input.amountCents <= 0) {
        throw new Error("amount must be positive");
      }

      const payment = await prisma.payment.create({
        data: {
          tenantId,
          invoiceId: input.invoiceId,
          amountCents: input.amountCents,
          method: input.method ?? "offline",
          paidAt: input.paidAt ?? new Date(),
          notes: input.notes ?? null,
        },
      });

      // Audit is attempted AFTER the payment commits so a log failure can
      // never roll back a committed payment.
      recordAudit(prisma, {
        tenantId,
        actorUserId,
        action: "payment.created",
        entityType: "Payment",
        entityId: payment.id,
        metadata: {
          invoiceId: input.invoiceId,
          amountCents: input.amountCents,
          method: input.method ?? "offline",
        },
      });

      return payment;
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
