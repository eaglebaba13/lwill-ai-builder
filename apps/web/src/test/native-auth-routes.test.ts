import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleNativeLogin,
  handleNativeLogout,
  handleNativeLogoutAll,
  handleNativeRefresh,
  type NativeAuthRouteServices,
} from "../lib/auth/native-auth-route-handlers";
import type { NativeCookieStore } from "../lib/auth/native-auth";

function request(path: string, body?: unknown): Request {
  return new Request(`https://builder.lwill.in${path}`, {
    method: "POST",
    headers: {
      origin: "https://builder.lwill.in",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function requestWithHeaders(
  path: string,
  headers: Record<string, string>,
  body?: unknown,
): Request {
  return new Request(`https://builder.lwill.in${path}`, {
    method: "POST",
    headers: {
      origin: "https://builder.lwill.in",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(): NativeAuthRouteServices {
  const values = new Map<string, string>();
  const cookies: NativeCookieStore = {
    get: (name) => {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set: (name, value) => { values.set(name, value); },
  };
  return {
    hasValidOrigin: vi.fn().mockResolvedValue(true),
    cookies,
    resolveTenantId: vi.fn().mockResolvedValue("tenant-1"),
    login: vi.fn().mockResolvedValue({ accessToken: "access", refreshToken: "refresh", verifiedSession: {} }),
    refresh: vi.fn().mockResolvedValue({ accessToken: "access", refreshToken: "refresh" }),
    resolveAccessSession: vi.fn().mockResolvedValue(null),
    resolveRefreshSession: vi.fn().mockResolvedValue(null),
    revokeSession: vi.fn(),
    revokeAllSessions: vi.fn(),
    clearCookies: vi.fn(),
    auditFailure: vi.fn(),
  } as NativeAuthRouteServices;
}

describe("native authentication routes", () => {
  let services: NativeAuthRouteServices;

  beforeEach(() => {
    services = createServices();
  });

  it("rejects cross-origin requests before authentication work", async () => {
    vi.mocked(services.hasValidOrigin).mockResolvedValue(false);
    expect((await handleNativeLogin(request("/api/auth/login", {}), services)).status).toBe(403);
    expect(services.login).not.toHaveBeenCalled();
  });

  it("logs in with server-resolved tenancy and rejects tenant input", async () => {
    expect((await handleNativeLogin(request("/api/auth/login", {
      email: "user@example.com",
      password: "password",
    }), services)).status).toBe(204);
    expect(services.login).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-1" }));

    expect((await handleNativeLogin(request("/api/auth/login", {
      email: "user@example.com",
      password: "password",
      tenantId: "tenant-2",
    }), services)).status).toBe(400);

    vi.mocked(services.login).mockResolvedValue(null);
    expect((await handleNativeLogin(request("/api/auth/login", {
      email: "user@example.com",
      password: "wrong",
    }), services)).status).toBe(401);
    expect(services.auditFailure).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.login.failed",
    }));
  });

  it("rotates the refresh cookie and audits rejected refreshes", async () => {
    services.cookies.set("lwill_refresh", "refresh", {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 1, expires: new Date(),
    });
    expect((await handleNativeRefresh(request("/api/auth/refresh"), services)).status).toBe(204);
    expect(services.refresh).toHaveBeenCalledWith("refresh");

    vi.mocked(services.refresh).mockResolvedValue(null);
    expect((await handleNativeRefresh(request("/api/auth/refresh"), services)).status).toBe(401);
    expect(services.auditFailure).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.refresh.failed" }));
  });

  it("derives current logout from refresh only when access is unavailable", async () => {
    vi.mocked(services.resolveRefreshSession).mockResolvedValue({
      sessionId: "session-1", userId: "user-1", tenantId: "tenant-1",
    });
    expect((await handleNativeLogout(request("/api/auth/logout"), services)).status).toBe(204);
    expect(services.revokeSession).toHaveBeenCalledWith("session-1");
  });

  it("requires an active access session for logout-all", async () => {
    expect((await handleNativeLogoutAll(request("/api/auth/logout-all"), services)).status).toBe(401);
    vi.mocked(services.resolveAccessSession).mockResolvedValue({
      sessionId: "session-1", userId: "user-1", tenantId: "tenant-1",
      externalAuthId: "user-1", displayName: null, email: null,
      businessUnitId: null, branchId: null, expiresAt: new Date("2099-01-01"),
    });
    expect((await handleNativeLogoutAll(request("/api/auth/logout-all"), services)).status).toBe(204);
    expect(services.revokeAllSessions).toHaveBeenCalledWith("user-1", "session-1");
  });

  it("resolves tenancy from the trusted reverse-proxy X-Forwarded-Host header", async () => {
    await handleNativeLogin(requestWithHeaders("/api/auth/login", {
      "x-forwarded-host": "xnail.makemeartist.com",
    }, { email: "user@example.com", password: "password" }), services);
    expect(services.resolveTenantId).toHaveBeenCalledWith("xnail.makemeartist.com");
  });

  it("resolves a different proxied production hostname the same way", async () => {
    await handleNativeLogin(requestWithHeaders("/api/auth/login", {
      "x-forwarded-host": "builder.lwill.in",
    }, { email: "user@example.com", password: "password" }), services);
    expect(services.resolveTenantId).toHaveBeenCalledWith("builder.lwill.in");
  });

  it("takes only the first hop of a multi-value X-Forwarded-Host header", async () => {
    await handleNativeLogin(requestWithHeaders("/api/auth/login", {
      "x-forwarded-host": "xnail.makemeartist.com, internal-proxy.local",
    }, { email: "user@example.com", password: "password" }), services);
    expect(services.resolveTenantId).toHaveBeenCalledWith("xnail.makemeartist.com");
  });

  it("falls back to the request URL hostname when no proxy header is present", async () => {
    await handleNativeLogin(request("/api/auth/login", {
      email: "user@example.com",
      password: "password",
    }), services);
    expect(services.resolveTenantId).toHaveBeenCalledWith("builder.lwill.in");
  });

  it("ignores a blank X-Forwarded-Host header and falls back safely", async () => {
    await handleNativeLogin(requestWithHeaders("/api/auth/login", {
      "x-forwarded-host": "   ",
    }, { email: "user@example.com", password: "password" }), services);
    expect(services.resolveTenantId).toHaveBeenCalledWith("builder.lwill.in");
  });
});
