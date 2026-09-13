import { describe, expect, it, vi } from "vitest";
import { handleListAttachments, handleGetAttachment, handleCreateAttachment, type AttachmentAuthorization, type AttachmentRouteServices } from "../lib/crm/attachment-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/attachments", { method: method ?? (body === undefined ? "GET" : "POST"), headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

function createServices(auth: AttachmentAuthorization): AttachmentRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    listAttachments: vi.fn().mockResolvedValue([{ id: "att-1", name: "contract.pdf", url: "https://example.com/contract.pdf" }]),
    getAttachment: vi.fn().mockResolvedValue({ id: "att-1", name: "contract.pdf", url: "https://example.com/contract.pdf" }),
    createAttachment: vi.fn().mockResolvedValue({ id: "att-1", name: "contract.pdf", url: "https://example.com/contract.pdf" }),
  };
}

const authorized: AttachmentAuthorization = { outcome: "authorized", tenantId: "t1", userId: "user-1" };

describe("attachment route handlers: auth gating", () => {
  it("returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListAttachments(request(), services)).status).toBe(401);
    expect((await handleCreateAttachment(request({ name: "test.pdf", url: "https://example.com/test.pdf" }), services)).status).toBe(401);
  });
});

describe("attachment route handlers: create", () => {
  it("returns 201 for create", async () => {
    const services = createServices(authorized);
    const result = await handleCreateAttachment(request({ name: "contract.pdf", url: "https://example.com/contract.pdf", mimeType: "application/pdf", sizeBytes: 1024, customerId: "cust-1" }), services);
    expect(result.status).toBe(201);
  });

  it("returns 400 for missing name", async () => {
    const services = createServices(authorized);
    expect((await handleCreateAttachment(request({ url: "https://example.com/test.pdf" }), services)).status).toBe(400);
  });

  it("returns 400 for missing url", async () => {
    const services = createServices(authorized);
    expect((await handleCreateAttachment(request({ name: "test.pdf" }), services)).status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateAttachment(request({ name: "test.pdf", url: "https://example.com/test.pdf", unknown: true }), services)).status).toBe(400);
  });

  it("returns 400 for invalid sizeBytes type", async () => {
    const services = createServices(authorized);
    expect((await handleCreateAttachment(request({ name: "test.pdf", url: "https://example.com/test.pdf", sizeBytes: "not-a-number" }), services)).status).toBe(400);
  });
});

describe("attachment route handlers: get/list", () => {
  it("returns 200 for get", async () => {
    const services = createServices(authorized);
    expect((await handleGetAttachment(request(), services, "att-1")).status).toBe(200);
  });

  it("returns 404 for missing", async () => {
    const services = createServices(authorized);
    (services as { getAttachment: unknown }).getAttachment = vi.fn().mockResolvedValue(null);
    expect((await handleGetAttachment(request(), services, "missing")).status).toBe(404);
  });

  it("returns 200 for list", async () => {
    const services = createServices(authorized);
    expect((await handleListAttachments(request(), services)).status).toBe(200);
  });
});
