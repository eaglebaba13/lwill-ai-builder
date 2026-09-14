import { describe, expect, it, vi } from "vitest";
import { handleGenerateSettlement, handleGetSettlement, handleListSettlements, handleApproveSettlement, type SettlementAuthorization, type SettlementRouteServices } from "../lib/crm/settlement-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/franchise/settlements/generate", {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(auth: SettlementAuthorization): SettlementRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    generateSettlement: vi.fn().mockResolvedValue({ settlement: { id: "s1", status: "CALCULATED" }, lines: [] }),
    getSettlement: vi.fn().mockResolvedValue({ settlement: { id: "s1" }, lines: [], payments: [] }),
    listSettlements: vi.fn().mockResolvedValue([{ id: "s1" }]),
    approveSettlement: vi.fn().mockResolvedValue({ id: "s1", status: "APPROVED" }),
  };
}

const authorized: SettlementAuthorization = { outcome: "authorized", tenantId: "t1", userId: "u1" };

describe("settlement route handlers: auth gating", () => {
  it("returns 401 for unauthenticated generate", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGenerateSettlement(request({ agreementId: "a1", periodStart: "2026-09-01", periodEnd: "2026-09-30" }), services)).status).toBe(401);
  });

  it("returns 401 for unauthenticated list", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListSettlements(request(), services)).status).toBe(401);
  });

  it("returns 401 for unauthenticated get", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetSettlement(request(), services, "s1")).status).toBe(401);
  });

  it("returns 401 for unauthenticated approve", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleApproveSettlement(request({}, "POST"), services, "s1")).status).toBe(401);
  });

  it("returns 403 for forbidden", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleGenerateSettlement(request({ agreementId: "a1", periodStart: "2026-09-01", periodEnd: "2026-09-30" }), services)).status).toBe(403);
  });
});

describe("settlement route handlers: generate", () => {
  it("uses settlement.generate permission", async () => {
    const services = createServices(authorized);
    await handleGenerateSettlement(request({ agreementId: "a1", periodStart: "2026-09-01", periodEnd: "2026-09-30" }), services);
    expect(services.authorize).toHaveBeenCalledWith("settlement.generate");
  });

  it("returns 201 for valid generate", async () => {
    const services = createServices(authorized);
    const result = await handleGenerateSettlement(request({ agreementId: "a1", periodStart: "2026-09-01", periodEnd: "2026-09-30" }), services);
    expect(result.status).toBe(201);
  });

  it("returns 400 for missing fields", async () => {
    const services = createServices(authorized);
    expect((await handleGenerateSettlement(request({ agreementId: "a1" }), services)).status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleGenerateSettlement(request({ agreementId: "a1", periodStart: "2026-09-01", periodEnd: "2026-09-30", extra: true }), services)).status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const services = createServices(authorized);
    const bad = new Request("https://builder.lwill.in/api/franchise/settlements/generate", { method: "POST", body: "not-json" });
    expect((await handleGenerateSettlement(bad, services)).status).toBe(400);
  });

  it("returns service error status", async () => {
    const services = createServices(authorized);
    (services as { generateSettlement: unknown }).generateSettlement = vi.fn().mockResolvedValue({ error: "Not found", status: 404 });
    expect((await handleGenerateSettlement(request({ agreementId: "a1", periodStart: "2026-09-01", periodEnd: "2026-09-30" }), services)).status).toBe(404);
  });
});

describe("settlement route handlers: get", () => {
  it("uses settlement.view permission", async () => {
    const services = createServices(authorized);
    await handleGetSettlement(request(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("settlement.view");
  });

  it("returns 200 for existing settlement", async () => {
    const services = createServices(authorized);
    expect((await handleGetSettlement(request(), services, "s1")).status).toBe(200);
  });

  it("returns 404 for missing settlement", async () => {
    const services = createServices(authorized);
    (services as { getSettlement: unknown }).getSettlement = vi.fn().mockResolvedValue(null);
    expect((await handleGetSettlement(request(), services, "missing")).status).toBe(404);
  });
});

describe("settlement route handlers: list", () => {
  it("uses settlement.view permission", async () => {
    const services = createServices(authorized);
    await handleListSettlements(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("settlement.view");
  });

  it("returns 200 with settlements", async () => {
    const services = createServices(authorized);
    const result = await handleListSettlements(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.settlements).toHaveLength(1);
  });
});

describe("settlement route handlers: approve", () => {
  it("uses settlement.approve permission", async () => {
    const services = createServices(authorized);
    await handleApproveSettlement(request({}, "POST"), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("settlement.approve");
  });

  it("returns 200 for successful approval", async () => {
    const services = createServices(authorized);
    const result = await handleApproveSettlement(request({}, "POST"), services, "s1");
    expect(result.status).toBe(200);
  });

  it("returns service error for failed approval", async () => {
    const services = createServices(authorized);
    (services as { approveSettlement: unknown }).approveSettlement = vi.fn().mockResolvedValue({ error: "Cannot approve", status: 400 });
    expect((await handleApproveSettlement(request({}, "POST"), services, "s1")).status).toBe(400);
  });
});
