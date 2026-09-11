import { describe, expect, it, vi } from "vitest";
import { createPaymentService } from "./payment-service";

type AuditCapture = Array<{
  tenantId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
}>;

function createService(auditCapture: AuditCapture, options: { auditFails?: boolean } = {}) {
  const auditLog = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      if (options.auditFails) {
        throw new Error("audit unavailable");
      }
      auditCapture.push(data as AuditCapture[number]);
      return { id: "audit-1" };
    },
  };

  // Tenant-aware invoice lookup: the returned record's tenantId mirrors the
  // requested tenant so cross-tenant isolation tests behave deterministically.
  // Returns null when the requested id is "missing" so not-found behavior is testable.
  const invoiceFindUnique = async ({ where }: { where: { id: string } }) => {
    if (where.id === "missing") return null;
    return { id: where.id, tenantId: "tenant-1" };
  };

  return createPaymentService({
    payment: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "payment-1", ...data }),
      findMany: async () => [],
      aggregate: async () => ({ _sum: { amountCents: 1500 } }),
    },
    invoice: { findUnique: invoiceFindUnique },
    auditLog,
  } as never);
}

const baseInput = {
  invoiceId: "invoice-1",
  amountCents: 1500,
  method: "offline",
};

describe("payment audit logging", () => {
  it("emits payment.created after a successful create", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    const payment = await service.createPayment("tenant-1", baseInput, "user-1");

    expect(audit).toHaveLength(1);
    expect(audit[0]).toEqual({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      action: "payment.created",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        invoiceId: "invoice-1",
        amountCents: 1500,
        method: "offline",
      },
    });
  });

  it("preserves the nullable actor semantics when no actor is supplied", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    await service.createPayment("tenant-1", baseInput, null);

    expect(audit[0]?.actorUserId).toBeNull();
  });

  it("does not emit an audit event when the invoice belongs to another tenant", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    await expect(service.createPayment("tenant-2", baseInput, "user-1")).rejects.toThrow(
      "invoice must belong to the same tenant",
    );

    expect(audit).toHaveLength(0);
  });

  it("does not emit an audit event when the amount is invalid", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    await expect(
      service.createPayment("tenant-1", { ...baseInput, amountCents: -50 }, "user-1"),
    ).rejects.toThrow("amount must be positive");

    expect(audit).toHaveLength(0);
  });

  it("scopes audit entries to the mutation tenant", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    await service.createPayment("tenant-1", baseInput, "user-1");

    expect(audit[0]?.tenantId).toBe("tenant-1");
  });

  it("does not roll back a committed payment when audit logging fails", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit, { auditFails: true });

    const payment = await service.createPayment("tenant-1", baseInput, "user-1");

    // Financial mutation committed despite audit failure.
    expect(payment.id).toBe("payment-1");
    expect(payment.amountCents).toBe(1500);
    // Audit was attempted but not recorded.
    expect(audit).toHaveLength(0);
  });
});