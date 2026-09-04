import { describe, expect, it, vi } from "vitest";
import {
  handleCreatePayment,
  handleListPaymentsForInvoice,
  type PaymentAuthorization,
  type PaymentRouteServices,
} from "../lib/crm/payment-route-handlers";

function request(body?: unknown, method?: string): Request {
  return new Request("https://builder.lwill.in/api/payments", {
    method: body === undefined ? "GET" : (method ?? "POST"),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: PaymentAuthorization, overrides: Partial<PaymentRouteServices> = {}): PaymentRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    createPayment: vi.fn().mockResolvedValue({
      id: "payment-1", tenantId: "tenant-1", invoiceId: "invoice-1",
      amountCents: 1500, method: "offline", paidAt: new Date(), notes: null,
      createdAt: new Date(), updatedAt: new Date(),
    }),
    listPaymentsForInvoice: vi.fn().mockResolvedValue([]),
    getPaymentTotal: vi.fn().mockResolvedValue(0),
    getInvoice: vi.fn().mockResolvedValue({ totalCents: 3500 }),
    ...overrides,
  };
}

describe("payment route handlers: authentication", () => {
  it("POST returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleCreatePayment(request({ invoiceId: "inv-1", amountCents: 1500 }), services);
    expect(result.status).toBe(401);
  });

  it("GET returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleListPaymentsForInvoice(request(), services, "inv-1");
    expect(result.status).toBe(401);
  });

  it("POST returns 403 for forbidden", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleCreatePayment(request({ invoiceId: "inv-1", amountCents: 1500 }), services);
    expect(result.status).toBe(403);
  });
});

describe("payment route handlers: create payment", () => {
  it("creates payment for authorized user", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreatePayment(request({ invoiceId: "inv-1", amountCents: 1500 }), services);
    expect(result.status).toBe(201);
    expect(services.createPayment).toHaveBeenCalledWith("tenant-1", { invoiceId: "inv-1", amountCents: 1500, method: undefined, paidAt: undefined, notes: undefined });
  });

  it("rejects missing invoiceId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreatePayment(request({ amountCents: 1500 }), services);
    expect(result.status).toBe(400);
  });

  it("rejects invalid amountCents", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreatePayment(request({ invoiceId: "inv-1", amountCents: -100 }), services);
    expect(result.status).toBe(400);
  });

  it("rejects zero amountCents", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreatePayment(request({ invoiceId: "inv-1", amountCents: 0 }), services);
    expect(result.status).toBe(400);
  });

  it("rejects extra fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreatePayment(request({ invoiceId: "inv-1", amountCents: 1500, extra: "field" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 404 for cross-tenant invoice", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { createPayment: vi.fn().mockRejectedValue(new Error("invoice must belong to the same tenant")) },
    );
    const result = await handleCreatePayment(request({ invoiceId: "inv-other", amountCents: 1500 }), services);
    expect(result.status).toBe(404);
  });
});

describe("payment route handlers: list payments", () => {
  it("returns payments for invoice", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        listPaymentsForInvoice: vi.fn().mockResolvedValue([
          { id: "p1", amountCents: 1500, method: "offline" },
        ]),
        getPaymentTotal: vi.fn().mockResolvedValue(1500),
        getInvoice: vi.fn().mockResolvedValue({ totalCents: 3500 }),
      },
    );
    const result = await handleListPaymentsForInvoice(request(), services, "inv-1");
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.payments).toHaveLength(1);
    expect(body.totalPaidCents).toBe(1500);
    expect(body.invoiceTotalCents).toBe(3500);
  });
});
