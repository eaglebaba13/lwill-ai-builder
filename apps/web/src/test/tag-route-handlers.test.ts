import { describe, expect, it, vi } from "vitest";
import { handleListTags, handleCreateTag, handleLinkTag, handleListTagsForEntity, type TagAuthorization, type TagRouteServices } from "../lib/crm/tag-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/tags", { method: method ?? (body === undefined ? "GET" : "POST"), headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

function createServices(auth: TagAuthorization): TagRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    listTags: vi.fn().mockResolvedValue([{ id: "tag-1", name: "VIP" }]),
    getTag: vi.fn().mockResolvedValue({ id: "tag-1", name: "VIP" }),
    createTag: vi.fn().mockResolvedValue({ id: "tag-1", name: "VIP" }),
    linkTag: vi.fn().mockResolvedValue({ id: "tl-1", tagId: "tag-1", entityType: "Lead", entityId: "lead-1" }),
    unlinkTag: vi.fn().mockResolvedValue(true),
    listTagsForEntity: vi.fn().mockResolvedValue([{ id: "tag-1", name: "VIP" }]),
  };
}

const authorized: TagAuthorization = { outcome: "authorized", tenantId: "t1", userId: "user-1" };

describe("tag route handlers: auth gating", () => {
  it("returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListTags(request(), services)).status).toBe(401);
    expect((await handleCreateTag(request({ name: "VIP" }), services)).status).toBe(401);
  });
});

describe("tag route handlers: list/create", () => {
  it("returns 200 with tags", async () => {
    const services = createServices(authorized);
    const result = await handleListTags(request(), services);
    expect(result.status).toBe(200);
  });

  it("returns 201 for create", async () => {
    const services = createServices(authorized);
    const result = await handleCreateTag(request({ name: "VIP" }), services);
    expect(result.status).toBe(201);
  });

  it("returns 400 for missing name", async () => {
    const services = createServices(authorized);
    expect((await handleCreateTag(request({}), services)).status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateTag(request({ name: "VIP", extra: true }), services)).status).toBe(400);
  });
});

describe("tag route handlers: link", () => {
  it("returns 201 for valid link", async () => {
    const services = createServices(authorized);
    const result = await handleLinkTag(request({ entityType: "Lead", entityId: "lead-1" }, "POST"), services, "tag-1");
    expect(result.status).toBe(201);
  });

  it("returns 400 for invalid entityType", async () => {
    const services = createServices(authorized);
    expect((await handleLinkTag(request({ entityType: "Invalid", entityId: "e1" }, "POST"), services, "tag-1")).status).toBe(400);
  });

  it("returns 400 for missing entityId", async () => {
    const services = createServices(authorized);
    expect((await handleLinkTag(request({ entityType: "Lead" }, "POST"), services, "tag-1")).status).toBe(400);
  });
});

describe("tag route handlers: listTagsForEntity", () => {
  it("returns 400 for missing params", async () => {
    const services = createServices(authorized);
    expect((await handleListTagsForEntity(request(), services)).status).toBe(400);
  });

  it("returns 200 with valid params", async () => {
    const services = createServices(authorized);
    const result = await handleListTagsForEntity(request(undefined, "GET", "https://builder.lwill.in/api/tags?entityType=Lead&entityId=lead-1"), services);
    expect(result.status).toBe(200);
  });
});
