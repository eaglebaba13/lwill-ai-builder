import { describe, expect, it, vi } from "vitest";
import { handleListCrmNotes, handleGetCrmNote, handleCreateCrmNote, type CrmNoteAuthorization, type CrmNoteRouteServices } from "../lib/crm/crm-note-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/crm-notes", { method: method ?? (body === undefined ? "GET" : "POST"), headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

function createServices(auth: CrmNoteAuthorization): CrmNoteRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    listNotes: vi.fn().mockResolvedValue([{ id: "note-1", body: "Test note" }]),
    getNote: vi.fn().mockResolvedValue({ id: "note-1", body: "Test note" }),
    createNote: vi.fn().mockResolvedValue({ id: "note-1", body: "Test note" }),
  };
}

const authorized: CrmNoteAuthorization = { outcome: "authorized", tenantId: "t1", userId: "user-1" };

describe("crm-note route handlers: auth gating", () => {
  it("returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListCrmNotes(request(), services)).status).toBe(401);
    expect((await handleCreateCrmNote(request({ body: "Test" }), services)).status).toBe(401);
  });
});

describe("crm-note route handlers: create", () => {
  it("returns 201 for create", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCrmNote(request({ body: "Called client", customerId: "cust-1" }), services);
    expect(result.status).toBe(201);
  });

  it("returns 400 for missing body", async () => {
    const services = createServices(authorized);
    expect((await handleCreateCrmNote(request({ customerId: "cust-1" }), services)).status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateCrmNote(request({ body: "Test", unknown: true }), services)).status).toBe(400);
  });
});

describe("crm-note route handlers: get/list", () => {
  it("returns 200 for get", async () => {
    const services = createServices(authorized);
    expect((await handleGetCrmNote(request(), services, "note-1")).status).toBe(200);
  });

  it("returns 404 for missing note", async () => {
    const services = createServices(authorized);
    (services as { getNote: unknown }).getNote = vi.fn().mockResolvedValue(null);
    expect((await handleGetCrmNote(request(), services, "missing")).status).toBe(404);
  });

  it("returns 200 for list with filters", async () => {
    const services = createServices(authorized);
    const result = await handleListCrmNotes(request(undefined, "GET", "https://builder.lwill.in/api/crm-notes?customerId=cust-1"), services);
    expect(result.status).toBe(200);
  });
});
