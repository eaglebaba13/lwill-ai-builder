import { describe, expect, it, vi } from "vitest";
import {
  handleListLeads,
  handleGetLead,
  handleCreateLead,
  handleUpdateLead,
  handleConvertLead,
  type LeadAuthorization,
  type LeadRouteServices,
} from "../lib/crm/lead-route-handlers";

function request(body?: unknown, method?: string): Request {
  return new Request("https://builder.lwill.in/api/leads", {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: LeadAuthorization): LeadRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listLeads: vi.fn().mockResolvedValue([{ id: "lead-1", name: "John", status: "ACTIVE" }]),
    getLead: vi.fn().mockResolvedValue({ id: "lead-1", name: "John", status: "ACTIVE" }),
    createLead: vi.fn().mockResolvedValue({ id: "lead-1", name: "John", status: "ACTIVE" }),
    updateLead: vi.fn().mockResolvedValue({ id: "lead-1", name: "John Updated", status: "ACTIVE" }),
    convertLead: vi.fn().mockResolvedValue({ lead: { id: "lead-1", status: "CONVERTED" }, customer: { id: "cust-1", name: "John", email: null, phone: null } }),
  };
}

const authorized: LeadAuthorization = { outcome: "authorized", tenantId: "tenant-1", userId: "user-1" };

describe("lead route handlers: authentication/authorization gating", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListLeads(request(), services)).status).toBe(401);
    expect((await handleCreateLead(request({ name: "John" }), services)).status).toBe(401);
    expect((await handleConvertLead(request(), services, "lead-1")).status).toBe(401);
    expect(services.listLeads).not.toHaveBeenCalled();
  });

  it("returns 403 for forbidden requests", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListLeads(request(), services)).status).toBe(403);
  });
});

describe("lead route handlers: CRUD", () => {
  it("passes customer.read permission for list", async () => {
    const services = createServices(authorized);
    await handleListLeads(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("customer.read");
    expect(services.listLeads).toHaveBeenCalledWith("tenant-1", undefined);
  });

  it("returns 200 with leads for authorized list", async () => {
    const services = createServices(authorized);
    const result = await handleListLeads(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.leads).toHaveLength(1);
  });

  it("returns 404 when lead not found", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getLead).mockResolvedValue(null);
    expect((await handleGetLead(request(), services, "missing")).status).toBe(404);
  });

  it("rejects create without name", async () => {
    const services = createServices(authorized);
    expect((await handleCreateLead(request({}), services)).status).toBe(400);
    expect((await handleCreateLead(request({ name: "" }), services)).status).toBe(400);
    expect(services.createLead).not.toHaveBeenCalled();
  });

  it("rejects create with unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateLead(request({ name: "John", unknown: true }), services)).status).toBe(400);
  });

  it("creates lead with valid input", async () => {
    const services = createServices(authorized);
    const result = await handleCreateLead(request({ name: "John", email: "john@example.com", source: "website" }), services);
    expect(result.status).toBe(201);
    expect(services.createLead).toHaveBeenCalledWith("tenant-1", expect.objectContaining({ name: "John", email: "john@example.com" }), "user-1");
  });

  it("rejects update with unknown fields", async () => {
    const services = createServices(authorized);
    const updateReq = new Request("https://builder.lwill.in/api/leads/lead-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unknown: true }),
    });
    expect((await handleUpdateLead(updateReq, services, "lead-1")).status).toBe(400);
  });

  it("returns 404 when updating non-existent lead", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateLead).mockResolvedValue(null);
    const updateReq = new Request("https://builder.lwill.in/api/leads/lead-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect((await handleUpdateLead(updateReq, services, "lead-1")).status).toBe(404);
  });
});

describe("lead route handlers: conversion", () => {
  it("passes customer.write permission for convert", async () => {
    const services = createServices(authorized);
    await handleConvertLead(request(), services, "lead-1");
    expect(services.authorize).toHaveBeenCalledWith("customer.write");
    expect(services.convertLead).toHaveBeenCalledWith("tenant-1", "lead-1", "user-1");
  });

  it("returns 200 with lead and customer on successful conversion", async () => {
    const services = createServices(authorized);
    const result = await handleConvertLead(request(), services, "lead-1");
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.lead.status).toBe("CONVERTED");
    expect(body.customer.id).toBe("cust-1");
  });

  it("returns 404 when lead not found or already converted", async () => {
    const services = createServices(authorized);
    vi.mocked(services.convertLead).mockResolvedValue(null);
    expect((await handleConvertLead(request(), services, "missing")).status).toBe(404);
  });
});