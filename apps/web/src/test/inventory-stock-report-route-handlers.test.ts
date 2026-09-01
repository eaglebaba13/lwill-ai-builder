import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleGetInventoryStockReport,
  type ReportAuthorization,
  type ReportRouteServices,
} from "../lib/crm/report-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(branchId?: string): Request {
  const url = branchId
    ? `https://builder.lwill.in/api/reports/inventory-stock?branchId=${encodeURIComponent(branchId)}`
    : "https://builder.lwill.in/api/reports/inventory-stock";
  return new Request(url, { method: "GET" });
}

function createServices(authorization: ReportAuthorization, inventoryStockReport: unknown): ReportRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    getReportSummary: vi.fn(),
    getFranchiseOverview: vi.fn(),
    getFranchisePayout: vi.fn(),
    getInventoryStockReport: vi.fn().mockResolvedValue(inventoryStockReport),
  };
}

describe("inventory-stock route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" }, []);
    expect((await handleGetInventoryStockReport(request(), services)).status).toBe(401);
    expect(services.getInventoryStockReport).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" }, []);
    expect((await handleGetInventoryStockReport(request(), services)).status).toBe(403);
    expect(services.getInventoryStockReport).not.toHaveBeenCalled();
  });
});

describe("inventory-stock route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" }, []);
    await handleGetInventoryStockReport(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with inventory stock report scoped to the authorized tenant", async () => {
    const report = [
      { stockItemId: "si-1", productId: "p1", productName: "Product 1", branchId: "b1", branchName: "Branch 1", quantity: 10, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-02") },
    ];
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" }, report);
    const result = await handleGetInventoryStockReport(request(), services);
    expect(result.status).toBe(200);
    expect(services.getInventoryStockReport).toHaveBeenCalledWith("tenant-1", undefined);
  });

  it("returns 200 with inventory stock report filtered by branchId", async () => {
    const report = [
      { stockItemId: "si-1", productId: "p1", productName: "Product 1", branchId: "b1", branchName: "Branch 1", quantity: 10, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-02") },
    ];
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" }, report);
    const result = await handleGetInventoryStockReport(request("b1"), services);
    expect(result.status).toBe(200);
    expect(services.getInventoryStockReport).toHaveBeenCalledWith("tenant-1", "b1");
  });

  it("returns the inventory stock report in the response body", async () => {
    const report = [
      { stockItemId: "si-1", productId: "p1", productName: "Product 1", branchId: "b1", branchName: "Branch 1", quantity: 10, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-02") },
    ];
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" }, report);
    const result = await handleGetInventoryStockReport(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { report: unknown };
    expect(body.report).toMatchObject([
      { stockItemId: "si-1", productId: "p1", productName: "Product 1", branchId: "b1", branchName: "Branch 1", quantity: 10 },
    ]);
  });
});

describe("inventory-stock route handlers: runtime authorization", () => {
  beforeEach(() => {
    setAuthenticationProvider(null);
    vi.mocked(loadPermissionGrants).mockResolvedValue([]);
  });

  it("returns 'unauthenticated' when the session is not authenticated", async () => {
    setAuthenticationProvider({
      async getAuthenticationContext() {
        return { authenticated: false } as never;
      },
    });

    const result = await handleGetInventoryStockReport(request(), {
      authorize: vi.fn().mockResolvedValue({ outcome: "unauthenticated" }),
      getReportSummary: vi.fn(),
      getFranchiseOverview: vi.fn(),
      getFranchisePayout: vi.fn(),
      getInventoryStockReport: vi.fn(),
    });
    expect(result.status).toBe(401);
  });
});