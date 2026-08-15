import "server-only";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  type NativeCookieStore,
  type NativeLoginResult,
  type NativeRefreshResult,
} from "./native-auth";
import type { VerifiedSessionRecord } from "./session-provider";

export interface TrustedLogoutSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly tenantId: string;
}

export interface NativeAuthRouteServices {
  readonly hasValidOrigin: (request: Request) => boolean;
  readonly cookies: NativeCookieStore;
  readonly resolveTenantId: (hostname: string) => Promise<string | null>;
  readonly login: (input: {
    email: string;
    password: string;
    tenantId: string;
    userAgent: string | null;
    ipAddress: null;
  }) => Promise<NativeLoginResult | null>;
  readonly refresh: (refreshToken: string | null) => Promise<NativeRefreshResult | null>;
  readonly resolveAccessSession: (accessToken: string | null) => Promise<VerifiedSessionRecord | null>;
  readonly resolveRefreshSession: (refreshToken: string | null) => Promise<TrustedLogoutSession | null>;
  readonly revokeSession: (sessionId: string) => Promise<void>;
  readonly revokeAllSessions: (userId: string, currentSessionId: string) => Promise<void>;
  readonly clearCookies: () => void;
  readonly auditFailure: (input: {
    tenantId: string;
    action: "auth.login.failed" | "auth.refresh.failed";
    reason: string;
    userAgent: string | null;
  }) => Promise<void>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number): Response {
  return new Response(null, { status, headers: RESPONSE_HEADERS });
}

function requestHostname(request: Request): string {
  return new URL(request.url).hostname;
}

async function resolveTenant(
  request: Request,
  services: NativeAuthRouteServices,
): Promise<string | null> {
  return services.resolveTenantId(requestHostname(request));
}

async function recordFailure(
  request: Request,
  services: NativeAuthRouteServices,
  action: "auth.login.failed" | "auth.refresh.failed",
  reason: string,
  tenantId?: string | null,
): Promise<void> {
  const resolvedTenantId = tenantId ?? await resolveTenant(request, services);
  if (resolvedTenantId === null) {
    return;
  }
  try {
    await services.auditFailure({
      tenantId: resolvedTenantId,
      action,
      reason,
      userAgent: request.headers.get("user-agent"),
    });
  } catch {
    // Authentication failures remain failures when audit persistence is unavailable.
  }
}

export async function handleNativeLogin(
  request: Request,
  services: NativeAuthRouteServices,
): Promise<Response> {
  if (!services.hasValidOrigin(request)) {
    return response(403);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return response(400);
  }
  if (
    typeof input !== "object" ||
    input === null ||
    Object.keys(input).some((key) => key !== "email" && key !== "password") ||
    typeof (input as Record<string, unknown>).email !== "string" ||
    typeof (input as Record<string, unknown>).password !== "string"
  ) {
    return response(400);
  }

  const tenantId = await resolveTenant(request, services);
  if (tenantId === null) {
    return response(401);
  }
  const result = await services.login({
    email: (input as { email: string }).email,
    password: (input as { password: string }).password,
    tenantId,
    userAgent: request.headers.get("user-agent"),
    ipAddress: null,
  });
  if (result === null) {
    await recordFailure(request, services, "auth.login.failed", "authentication_rejected", tenantId);
    return response(401);
  }
  return response(204);
}

export async function handleNativeRefresh(
  request: Request,
  services: NativeAuthRouteServices,
): Promise<Response> {
  if (!services.hasValidOrigin(request)) {
    return response(403);
  }
  const result = await services.refresh(
    services.cookies.get(REFRESH_COOKIE_NAME)?.value ?? null,
  );
  if (result === null) {
    await recordFailure(request, services, "auth.refresh.failed", "refresh_rejected");
    return response(401);
  }
  return response(204);
}

export async function handleNativeLogout(
  request: Request,
  services: NativeAuthRouteServices,
): Promise<Response> {
  if (!services.hasValidOrigin(request)) {
    return response(403);
  }
  const accessSession = await services.resolveAccessSession(
    services.cookies.get(ACCESS_COOKIE_NAME)?.value ?? null,
  );
  const trustedSession = accessSession ?? await services.resolveRefreshSession(
    services.cookies.get(REFRESH_COOKIE_NAME)?.value ?? null,
  );
  if (trustedSession !== null) {
    await services.revokeSession(trustedSession.sessionId);
  } else {
    services.clearCookies();
  }
  return response(204);
}

export async function handleNativeLogoutAll(
  request: Request,
  services: NativeAuthRouteServices,
): Promise<Response> {
  if (!services.hasValidOrigin(request)) {
    return response(403);
  }
  const accessSession = await services.resolveAccessSession(
    services.cookies.get(ACCESS_COOKIE_NAME)?.value ?? null,
  );
  if (accessSession === null) {
    services.clearCookies();
    return response(401);
  }
  await services.revokeAllSessions(accessSession.userId, accessSession.sessionId);
  return response(204);
}
