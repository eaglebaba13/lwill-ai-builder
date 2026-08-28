import { describe, expect, it, vi } from "vitest";
import {
  handleCreateBranch,
  handleGetBranch,
  handleListBranches,
  handleUpdateBranch,
  type BranchAuthorization,
  type BranchRouteServices,
} from "../lib/crm/branch-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/branches", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: BranchAuthorization): BranchRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listBranches: vi.fn().mockResolvedValue([{ id: "branch-1", businessUnitId: "bu-1", name: "Main", slug: "main", isActive: true }]),
    getBranch: vi.fn().mockResolvedValue({ id: "branch-1", businessUnitId: "bu-1", name: "Main", slug: "main", isActive: true }),
    createBranch: vi.fn().mockResolvedValue({ id: "branch-1", businessUnitId: "bu-1", name: "Main", slug: "main", isActive: true }),
    updateBranch: vi.fn().mockResolvedValue({ id: "branch-1", businessUnitId: "bu-1", name: "Main", slug: "main", isActive: true }),
  };
}

describe("branch route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListBranches(request(), services)).status).toBe(401);
    expect(
      (await handleCreateBranch(request({ businessUnitId: "bu-1", name: "Main", slug: "main" }), services)).status,
    ).toBe(401);
    expect((await handleGetBranch(request(), services, "b1")).status).toBe(401);
    expect(
      (await handleUpdateBranch(request({ name: "Main" }), services, "b1")).status,
    ).toBe(401);
    expect(services.listBranches).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListBranches(request(), services)).status).toBe(403);
    expect(
      (await handleCreateBranch(request({ businessUnitId: "bu-1", name: "Main", slug: "main" }), services)).status,
    ).toBe(403);
    expect(services.createBranch).not.toHaveBeenCalled();
  });
});

describe("branch route handlers: permission code forwarding", () => {
  it("passes 'branch.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListBranches(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("branch.read");

    await handleGetBranch(request(), services, "b1");
    expect(services.authorize).toHaveBeenCalledWith("branch.read");
  });

  it("passes 'branch.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateBranch(request({ businessUnitId: "bu-1", name: "Main", slug: "main" }), services);
    expect(services.authorize).toHaveBeenCalledWith("branch.write");

    await handleUpdateBranch(request({ name: "Main" }), services, "b1");
    expect(services.authorize).toHaveBeenCalledWith("branch.write");
  });
});

describe("branch route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateBranch(request({}), services)).status).toBe(400);
    expect(
      (await handleCreateBranch(request({ businessUnitId: "", name: "Main", slug: "main" }), services)).status,
    ).toBe(400);
    expect(
      (await handleCreateBranch(request({ businessUnitId: "bu-1", name: "", slug: "main" }), services)).status,
    ).toBe(400);
    expect(
      (await handleCreateBranch(request({ businessUnitId: "bu-1", name: "Main", slug: "", isActive: "yes" }), services)).status,
    ).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (
        await handleCreateBranch(
          request({ businessUnitId: "bu-1", name: "Main", slug: "main", tenantId: "attacker" }),
          services,
        )
      ).status,
    ).toBe(400);
  });

  it("rejects invalid update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateBranch(request({}), services, "b1")).status).toBe(400);
    expect((await handleUpdateBranch(request({ name: "" }), services, "b1")).status).toBe(400);
  });

  it("rejects unknown keys in update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleUpdateBranch(request({ name: "Main", unknown: true }), services, "b1")).status,
    ).toBe(400);
  });
});

describe("branch route handlers: successful operations", () => {
  it("creates branch and returns 201", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const response = await handleCreateBranch(
      request({ businessUnitId: "bu-1", name: "Main", slug: "main" }),
      services,
    );
    expect(response.status).toBe(201);
    expect(services.createBranch).toHaveBeenCalledWith("tenant-1", {
      businessUnitId: "bu-1",
      name: "Main",
      slug: "main",
      isActive: true,
    });
  });

  it("gets branch and returns 200", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const response = await handleGetBranch(request(), services, "b1");
    expect(response.status).toBe(200);
    expect(services.getBranch).toHaveBeenCalledWith("tenant-1", "b1");
  });

  it("updates branch and returns 200", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const response = await handleUpdateBranch(
      request({ name: "Updated" }),
      services,
      "b1",
    );
    expect(response.status).toBe(200);
    expect(services.updateBranch).toHaveBeenCalledWith("tenant-1", "b1", {
      name: "Updated",
    });
  });
});
