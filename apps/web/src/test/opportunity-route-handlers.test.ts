import { describe, expect, it, vi } from "vitest";
import {
  handleListPipelines,
  handleCreatePipeline,
  handleListStages,
  handleCreateStage,
  handleListOpportunities,
  handleGetOpportunity,
  handleCreateOpportunity,
  handleUpdateOpportunity,
  handleMoveOpportunity,
  type OpportunityAuthorization,
  type OpportunityRouteServices,
} from "../lib/crm/opportunity-route-handlers";

function request(body?: unknown, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/opportunities", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: OpportunityAuthorization): OpportunityRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listPipelines: vi.fn().mockResolvedValue([{ id: "p1", name: "Sales" }]),
    getPipeline: vi.fn().mockResolvedValue({ id: "p1", name: "Sales" }),
    createPipeline: vi.fn().mockResolvedValue({ id: "p1", name: "Sales" }),
    listStages: vi.fn().mockResolvedValue([{ id: "s1", name: "Lead", position: 0 }]),
    createStage: vi.fn().mockResolvedValue({ id: "s1", name: "Lead", position: 0 }),
    listOpportunities: vi.fn().mockResolvedValue([{ id: "o1", name: "Deal", status: "OPEN" }]),
    getOpportunity: vi.fn().mockResolvedValue({ id: "o1", name: "Deal", status: "OPEN" }),
    createOpportunity: vi.fn().mockResolvedValue({ id: "o1", name: "Deal", status: "OPEN" }),
    updateOpportunity: vi.fn().mockResolvedValue({ id: "o1", name: "Deal Updated", status: "OPEN" }),
    moveOpportunity: vi.fn().mockResolvedValue({ id: "o1", stageId: "s2" }),
  };
}

const authorized: OpportunityAuthorization = { outcome: "authorized", tenantId: "t1", userId: "user-1" };

describe("opportunity route handlers: auth gating", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListPipelines(request(), services)).status).toBe(401);
    expect((await handleCreatePipeline(request({ name: "Sales" }), services)).status).toBe(401);
    expect((await handleCreateOpportunity(request({ pipelineId: "p1", stageId: "s1", name: "Deal" }), services)).status).toBe(401);
    expect((await handleMoveOpportunity(request({ stageId: "s2" }), services, "o1")).status).toBe(401);
    expect(services.listPipelines).not.toHaveBeenCalled();
  });

  it("returns 403 for forbidden requests", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListPipelines(request(), services)).status).toBe(403);
  });
});

describe("opportunity route handlers: pipeline CRUD", () => {
  it("lists pipelines with customer.read permission", async () => {
    const services = createServices(authorized);
    const result = await handleListPipelines(request(), services);
    expect(result.status).toBe(200);
    expect(services.authorize).toHaveBeenCalledWith("customer.read");
  });

  it("creates pipeline with valid input", async () => {
    const services = createServices(authorized);
    const result = await handleCreatePipeline(request({ name: "Sales" }), services);
    expect(result.status).toBe(201);
    expect(services.createPipeline).toHaveBeenCalledWith("t1", "Sales");
  });

  it("rejects create pipeline without name", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePipeline(request({}), services)).status).toBe(400);
    expect((await handleCreatePipeline(request({ name: "" }), services)).status).toBe(400);
  });
});

describe("opportunity route handlers: stage CRUD", () => {
  it("lists stages with pipelineId query param", async () => {
    const services = createServices(authorized);
    const result = await handleListStages(request(undefined, "https://builder.lwill.in/api/stages?pipelineId=p1"), services);
    expect(result.status).toBe(200);
    expect(services.listStages).toHaveBeenCalledWith("t1", "p1");
  });

  it("rejects list stages without pipelineId", async () => {
    const services = createServices(authorized);
    expect((await handleListStages(request(), services)).status).toBe(400);
  });

  it("creates stage with valid input", async () => {
    const services = createServices(authorized);
    const result = await handleCreateStage(request({ pipelineId: "p1", name: "Lead", position: 0 }), services);
    expect(result.status).toBe(201);
  });

  it("rejects create stage without required fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateStage(request({}), services)).status).toBe(400);
    expect((await handleCreateStage(request({ pipelineId: "p1" }), services)).status).toBe(400);
    expect((await handleCreateStage(request({ pipelineId: "p1", name: "Lead" }), services)).status).toBe(400);
  });
});

describe("opportunity route handlers: opportunity CRUD", () => {
  it("lists opportunities", async () => {
    const services = createServices(authorized);
    const result = await handleListOpportunities(request(), services);
    expect(result.status).toBe(200);
  });

  it("gets opportunity by ID", async () => {
    const services = createServices(authorized);
    const result = await handleGetOpportunity(request(), services, "o1");
    expect(result.status).toBe(200);
  });

  it("returns 404 for non-existent opportunity", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getOpportunity).mockResolvedValue(null);
    expect((await handleGetOpportunity(request(), services, "missing")).status).toBe(404);
  });

  it("creates opportunity with valid input", async () => {
    const services = createServices(authorized);
    const result = await handleCreateOpportunity(request({ pipelineId: "p1", stageId: "s1", name: "Deal" }), services);
    expect(result.status).toBe(201);
    expect(services.createOpportunity).toHaveBeenCalledWith("t1", expect.objectContaining({ pipelineId: "p1", stageId: "s1", name: "Deal" }), "user-1");
  });

  it("rejects create opportunity without required fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateOpportunity(request({}), services)).status).toBe(400);
    expect((await handleCreateOpportunity(request({ pipelineId: "p1", stageId: "s1" }), services)).status).toBe(400);
    expect((await handleCreateOpportunity(request({ pipelineId: "p1", stageId: "s1", name: "" }), services)).status).toBe(400);
    expect((await handleCreateOpportunity(request({ pipelineId: "p1", stageId: "s1", name: "Deal", unknown: true }), services)).status).toBe(400);
  });

  it("updates opportunity", async () => {
    const services = createServices(authorized);
    const updateReq = new Request("https://builder.lwill.in/api/opportunities/o1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated Deal", valueCents: 50000 }),
    });
    const result = await handleUpdateOpportunity(updateReq, services, "o1");
    expect(result.status).toBe(200);
  });

  it("returns 404 when updating non-existent opportunity", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateOpportunity).mockResolvedValue(null);
    const updateReq = new Request("https://builder.lwill.in/api/opportunities/o1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect((await handleUpdateOpportunity(updateReq, services, "missing")).status).toBe(404);
  });

  it("moves opportunity to new stage", async () => {
    const services = createServices(authorized);
    const result = await handleMoveOpportunity(request({ stageId: "s2" }), services, "o1");
    expect(result.status).toBe(200);
    expect(services.moveOpportunity).toHaveBeenCalledWith("t1", "o1", "s2", "user-1");
  });

  it("rejects move without stageId", async () => {
    const services = createServices(authorized);
    expect((await handleMoveOpportunity(request({}), services, "o1")).status).toBe(400);
  });

  it("returns 404 when moving non-existent opportunity", async () => {
    const services = createServices(authorized);
    vi.mocked(services.moveOpportunity).mockResolvedValue(null);
    expect((await handleMoveOpportunity(request({ stageId: "s2" }), services, "missing")).status).toBe(404);
  });
});