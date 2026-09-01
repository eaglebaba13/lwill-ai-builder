import { describe, expect, it, vi } from "vitest";
import {
  handleGetPlatformHealth,
  type PlatformAuthorization,
  type PlatformRouteServices,
} from "../lib/platform/platform-route-handlers";

function request() {
  return new Request("https://builder.lwill.in/api/platform/health", { method: "GET" });
}

function createServices(authorization: PlatformAuthorization): PlatformRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
  };
}

describe("platform health route handler", () => {
  it("returns 401 for unauthenticated callers", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleGetPlatformHealth(request(), services);
    expect(result.status).toBe(401);
    expect(services.authorize).toHaveBeenCalledWith("platform.manage");
  });

  it("returns 403 for authenticated callers without platform permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleGetPlatformHealth(request(), services);
    expect(result.status).toBe(403);
  });

  it("returns 200 with platform status for authorized callers", async () => {
    const services = createServices({ outcome: "authorized", userId: "user-1" });
    const result = await handleGetPlatformHealth(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json() as { status: string; scope: string };
    expect(body.status).toBe("ok");
    expect(body.scope).toBe("platform");
  });

  it("uses platform.manage permission code", async () => {
    const services = createServices({ outcome: "authorized", userId: "user-1" });
    await handleGetPlatformHealth(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("platform.manage");
  });
});
