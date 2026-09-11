import { describe, expect, it, vi } from "vitest";
import { createBillingInvoiceService } from "./invoice-service";

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

  // Tenant-aware mocks: the returned record's tenantId mirrors the input's,
  // so cross-tenant isolation tests behave deterministically.
  const invoiceCreate = async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data });
  const invoiceFindUnique = async ({ where }: { where: { id: string } }) => {
    if (where.id === "missing") return null;
    return {
      id: where.id,
      tenantId: "tenant-1",
      subtotalCents: 5500,
      discountCents: 500,
      gstCents: 450,
      totalCents: 5450,
    };
  };
  const invoiceUpdate = async ({ data }: { data: Record<string, unknown> }) => ({ id: "invoice-1", ...data });

  // The customer mock derives the tenantId from the customer id by stripping
  // the "customer-" prefix, so a request whose input.tenantId does not match
  // the customer's tenant triggers the validation guard deterministically.
  // Accepts both the outer-scope call shape and the in-transaction shape.
  const customerFindUnique = async (args: { where?: { id: string }; id?: string }) => {
    const id = args.where?.id ?? args.id ?? "";
    return { id, tenantId: id.replace(/^customer-/, "tenant-") };
  };

  return createBillingInvoiceService({
    invoice: { create: invoiceCreate, findUnique: invoiceFindUnique, findMany: async () => [], update: invoiceUpdate },
    invoiceLineItem: { create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }), findMany: async () => [] },
    customer: { findUnique: customerFindUnique },
    service: { findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }) },
    package: { findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }) },
    product: { findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }) },
    stockItem: { findFirst: async () => null, create: async () => ({ id: "stock-item-1" }), update: async () => ({ id: "stock-item-1" }) },
    stockMovement: { create: async () => ({ id: "movement-1" }) },
    branch: { findUnique: async () => null },
    auditLog,
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback({
        invoice: { create: invoiceCreate, findUnique: invoiceFindUnique, findMany: async () => [], update: invoiceUpdate },
        invoiceLineItem: { create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "line-1", ...data }), findMany: async () => [] },
        customer: { findUnique: customerFindUnique },
        service: { findUnique: async () => ({ id: "service-1", tenantId: "tenant-1" }) },
        package: { findUnique: async () => ({ id: "pkg-1", tenantId: "tenant-1" }) },
        product: { findUnique: async () => ({ id: "product-1", tenantId: "tenant-1" }) },
        stockItem: { findFirst: async () => null, create: async () => ({ id: "stock-item-1" }), update: async () => ({ id: "stock-item-1" }) },
        stockMovement: { create: async () => ({ id: "movement-1" }) },
        branch: { findUnique: async () => null },
      } as unknown),
  } as never);
}

const baseInput = {
  tenantId: "tenant-1",
  customerId: "customer-1",
  issuedAt: new Date("2026-09-02T10:00:00.000Z"),
  discountCents: 500,
  gstCents: 450,
  items: [
    { description: "Classic manicure", serviceId: "service-1", quantity: 2, unitPriceCents: 1500 },
    { description: "Glow package", packageId: "pkg-1", quantity: 1, unitPriceCents: 2500 },
  ],
};

describe("billing invoice audit logging", () => {
  it("emits invoice.created after a successful create", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    const invoice = await service.createInvoice(baseInput, "user-1");

    expect(audit).toHaveLength(1);
    expect(audit[0]).toEqual({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      action: "invoice.created",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: {
        customerId: "customer-1",
        branchId: null,
        subtotalCents: 5500,
        discountCents: 500,
        gstCents: 450,
        totalCents: 5450,
        itemCount: 2,
      },
    });
  });

  it("preserves the nullable actor semantics when no actor is supplied", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    await service.createInvoice(baseInput, null);

    expect(audit[0]?.actorUserId).toBeNull();
  });

  it("does not emit an audit event when validation fails", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    // The customer mock returns tenant-1; requesting a different tenant
    // triggers the tenant/validation guard before any invoice or audit write.
    await expect(
      service.createInvoice({ ...baseInput, tenantId: "tenant-2" }, "user-1"),
    ).rejects.toThrow("customer must belong to the same tenant");

    expect(audit).toHaveLength(0);
  });

  it("emits invoice.updated with the actual changed fields", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    const updated = await service.updateInvoice({
      tenantId: "tenant-1",
      invoiceId: "invoice-1",
      input: { discountCents: 200, notes: "VIP" },
      actorUserId: "user-1",
    });

    expect(updated).not.toBeNull();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toEqual({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      action: "invoice.updated",
      entityType: "Invoice",
      entityId: "invoice-1",
      metadata: {
        changes: {
          discountCents: 200,
          totalCents: 5500 - 200 + 450,
          notes: "VIP",
        },
      },
    });
  });

  it("does not emit an audit event when the invoice cannot be found", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    const result = await service.updateInvoice({
      tenantId: "tenant-1",
      invoiceId: "missing",
      input: { notes: "x" },
      actorUserId: "user-1",
    });

    expect(result).toBeNull();
    expect(audit).toHaveLength(0);
  });

  it("scopes audit entries to the mutation tenant", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit);

    // The customer mock derives tenantId from the customer id, so the
    // customer id must match the requested tenant for the create to succeed.
    await service.createInvoice(
      { ...baseInput, tenantId: "tenant-9", customerId: "customer-9", items: [{ description: "X", serviceId: null, quantity: 1, unitPriceCents: 1000 }] },
      "user-9",
    );

    expect(audit[0]?.tenantId).toBe("tenant-9");
  });

  it("does not roll back a committed invoice when audit logging fails", async () => {
    const audit: AuditCapture = [];
    const service = createService(audit, { auditFails: true });

    const invoice = await service.createInvoice(baseInput, "user-1");

    // Financial mutation committed despite audit failure.
    expect(invoice.id).toBe("invoice-1");
    expect(invoice.totalCents).toBe(5450);
    // Audit was attempted but not recorded.
    expect(audit).toHaveLength(0);
  });
});