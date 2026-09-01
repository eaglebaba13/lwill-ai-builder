import { describe, expect, it, vi } from "vitest";
import {
  handleCreateReorderRule,
  handleGetReorderRule,
  handleListReorderRules,
  handleUpdateReorderRule,
  type ReorderRuleAuthorization,
  type ReorderRuleRouteServices,
} from "../lib/crm/reorder-rule-route-handlers";

function request(method: string, body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/reorder-rules", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: ReorderRuleAuthorization): ReorderRuleRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listReorderRules: vi.fn().mockResolvedValue([{ id: "rule-1" }]),
    getReorderRule: vi.fn().mockResolvedValue({ id: "rule-1" }),
    createReorderRule: vi.fn().mockResolvedValue({ id: "rule-1" }),
    updateReorderRule: vi.fn().mockResolvedValue({ id: "rule-1" }),
  };
}

describe("reorder rule route handlers: permission code forwarding", () => {
  it("uses 'reorderRule.read' for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListReorderRules(request("GET"), services);
    expect(services.authorize).toHaveBeenCalledWith("reorderRule.read");

    await handleGetReorderRule(request("GET"), services, "rule-1");
    expect(services.authorize).toHaveBeenCalledWith("reorderRule.read");
  });

  it("uses 'reorderRule.write' for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateReorderRule(
      request("POST", { productId: "p1", branchId: "b1", warehouseId: "w1", minQuantity: 5, reorderQuantity: 10 }),
      services,
    );
    expect(services.authorize).toHaveBeenCalledWith("reorderRule.write");

    await handleUpdateReorderRule(
      request("PATCH", { minQuantity: 7 }),
      services,
      "rule-1",
    );
    expect(services.authorize).toHaveBeenCalledWith("reorderRule.write");
  });
});

describe("reorder rule route handlers: auth gating", () => {
  it("returns 401 for unauthenticated callers on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListReorderRules(request("GET"), services)).status).toBe(401);
    expect((await handleGetReorderRule(request("GET"), services, "rule-1")).status).toBe(401);
    expect(
      (await handleCreateReorderRule(
        request("POST", { productId: "p1", branchId: "b1", warehouseId: "w1", minQuantity: 5, reorderQuantity: 10 }),
        services,
      )).status,
    ).toBe(401);
    expect(
      (await handleUpdateReorderRule(request("PATCH", { minQuantity: 7 }), services, "rule-1")).status,
    ).toBe(401);
    expect(services.listReorderRules).not.toHaveBeenCalled();
    expect(services.createReorderRule).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated callers without the grant", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListReorderRules(request("GET"), services)).status).toBe(403);
    expect(
      (await handleCreateReorderRule(
        request("POST", { productId: "p1", branchId: "b1", warehouseId: "w1", minQuantity: 5, reorderQuantity: 10 }),
        services,
      )).status,
    ).toBe(403);
    expect(services.createReorderRule).not.toHaveBeenCalled();
  });
});

describe("reorder rule route handlers: tenant isolation", () => {
  it("ignores client-supplied tenantId and uses server-derived tenantId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateReorderRule(
      request("POST", {
        productId: "p1",
        branchId: "b1",
        warehouseId: "w1",
        minQuantity: 5,
        reorderQuantity: 10,
        tenantId: "attacker",
      }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createReorderRule).not.toHaveBeenCalled();
  });
});
