import { describe, expect, it, vi } from "vitest";
import {
  handleCreateSetting,
  handleGetSetting,
  handleListSettings,
  handleUpdateSetting,
  type SettingAuthorization,
  type SettingRouteServices,
} from "../lib/crm/setting-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/settings", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: SettingAuthorization): SettingRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listSettings: vi.fn().mockResolvedValue([{ id: "setting-1" }]),
    getSetting: vi.fn().mockResolvedValue({ id: "setting-1" }),
    createSetting: vi.fn().mockResolvedValue({ id: "setting-1" }),
    updateSetting: vi.fn().mockResolvedValue({ id: "setting-1" }),
  };
}

describe("setting route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListSettings(request(), services)).status).toBe(401);
    expect(
      (await handleCreateSetting(request({ key: "theme", value: "dark" }), services)).status,
    ).toBe(401);
    expect((await handleGetSetting(request(), services, "s1")).status).toBe(401);
    expect((await handleUpdateSetting(request({ key: "theme" }), services, "s1")).status).toBe(401);
    expect(services.listSettings).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListSettings(request(), services)).status).toBe(403);
    expect(
      (await handleCreateSetting(request({ key: "theme", value: "dark" }), services)).status,
    ).toBe(403);
    expect(services.createSetting).not.toHaveBeenCalled();
  });
});

describe("setting route handlers: permission code forwarding", () => {
  it("passes 'setting.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListSettings(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("setting.read");

    await handleGetSetting(request(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("setting.read");
  });

  it("passes 'setting.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateSetting(request({ key: "theme", value: "dark" }), services);
    expect(services.authorize).toHaveBeenCalledWith("setting.write");

    await handleUpdateSetting(request({ key: "theme" }), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("setting.write");
  });
});

describe("setting route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateSetting(request({}), services)).status).toBe(400);
    expect((await handleCreateSetting(request({ key: "" }), services)).status).toBe(400);
    expect((await handleCreateSetting(request({ key: "theme", value: "" }), services)).status).toBe(400);
    expect(
      (await handleCreateSetting(request({ key: "theme", value: "dark", isActive: "yes" }), services)).status,
    ).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleCreateSetting(request({ key: "theme", value: "dark", tenantId: "attacker" }), services)).status,
    ).toBe(400);
  });

  it("rejects invalid update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateSetting(request({}), services, "s1")).status).toBe(400);
    expect((await handleUpdateSetting(request({ key: "" }), services, "s1")).status).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateSetting(
      request({ key: "theme", value: "dark", isActive: false }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createSetting).toHaveBeenCalledWith("tenant-1", {
      key: "theme",
      value: "dark",
      isActive: false,
    });
  });

  it("returns 404 for non-existent setting", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getSetting).mockResolvedValue(null);
    expect((await handleGetSetting(request(), services, "missing")).status).toBe(404);
  });

  it("returns 404 when updating a non-existent/cross-tenant setting", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.updateSetting).mockResolvedValue(null);
    expect((await handleUpdateSetting(request({ key: "X" }), services, "missing")).status).toBe(404);
  });
});

describe("setting route handlers: authorized operations", () => {
  it("returns 200 with setting list for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.listSettings).mockResolvedValue([
      { id: "s1", key: "theme", value: "dark" },
      { id: "s2", key: "lang", value: "en" },
    ]);
    const result = await handleListSettings(request(), services);
    expect(result.status).toBe(200);
    expect(services.listSettings).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with setting for authorized get", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetSetting(request(), services, "s1");
    expect(result.status).toBe(200);
  });
});
