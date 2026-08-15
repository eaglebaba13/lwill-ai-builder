import "server-only";
import { cookies } from "next/headers";
import { prisma } from "../../../../../packages/database/src/client";
import {
  normalizeHostname,
  resolveTenantByHostname,
} from "../../../../../packages/authentication-context-prisma/src/tenant-domain";
import { hasValidAuthenticationOrigin } from "./auth-origin";
import { loadNativeAuthRuntimeConfig } from "./native-auth-config";
import {
  clearNativeAuthCookies,
  createNativeJwt,
  createNativePrismaSessionAuthenticationProvider,
  loginWithNativeCookies,
  refreshNativeSession,
  resolveNativeAccessSession,
  resolveNativeRefreshSession,
  revokeAllNativeSessions,
  revokeNativeSession,
  type NativeCookieStore,
  type NativeRefreshPrismaClient,
} from "./native-auth";
import type { LoginPrismaClient } from "./login-service";
import type { NativeAuthRouteServices } from "./native-auth-route-handlers";
import { setAuthenticationProvider } from "./server-context";

let runtime: ReturnType<typeof createRuntime> | null = null;
let providerRegistered = false;

function createRuntime() {
  const config = loadNativeAuthRuntimeConfig();
  return { config, jwt: createNativeJwt(config.jwt) };
}

function getRuntime() {
  runtime ??= createRuntime();
  return runtime;
}

async function getCookieStore(): Promise<NativeCookieStore> {
  return await cookies();
}

export function registerNativeAuthenticationProvider(): void {
  if (providerRegistered) {
    return;
  }
  const { jwt } = getRuntime();
  setAuthenticationProvider(
    createNativePrismaSessionAuthenticationProvider({
      resolveAccessToken: async () =>
        (await getCookieStore()).get("lwill_access")?.value ?? null,
      jwt,
    }),
  );
  providerRegistered = true;
}

export async function createNativeAuthRouteServices(
  request: Request,
): Promise<NativeAuthRouteServices> {
  const { config, jwt } = getRuntime();
  const cookieStore = await getCookieStore();
  const nativePrisma = prisma as unknown as NativeRefreshPrismaClient;
  const loginPrisma = prisma as unknown as LoginPrismaClient;
  const userAgent = request.headers.get("user-agent");

  return {
    hasValidOrigin: (candidate) =>
      hasValidAuthenticationOrigin(candidate, config.allowedOrigin),
    cookies: cookieStore,
    async resolveTenantId(hostname) {
      const domain = normalizeHostname(hostname);
      if (domain === null) {
        return null;
      }
      const records = await prisma.tenantDomain.findMany({
        where: {
          domain: { in: [domain, `www.${domain}`] },
          isActive: true,
          verificationStatus: "verified",
          tenant: { isActive: true },
        },
        include: { tenant: { select: { id: true, isActive: true } } },
      });
      return resolveTenantByHostname(hostname, records)?.tenantId ?? null;
    },
    login: (input) => loginWithNativeCookies(loginPrisma, input, jwt, cookieStore),
    refresh: (refreshToken) => refreshNativeSession(nativePrisma, refreshToken, jwt, cookieStore),
    resolveAccessSession: (accessToken) => resolveNativeAccessSession(nativePrisma, accessToken, jwt),
    resolveRefreshSession: (refreshToken) => resolveNativeRefreshSession(nativePrisma, refreshToken),
    revokeSession: (sessionId) => revokeNativeSession(nativePrisma, sessionId, new Date(), cookieStore),
    revokeAllSessions: (userId, currentSessionId) =>
      revokeAllNativeSessions(nativePrisma, userId, new Date(), cookieStore, currentSessionId),
    clearCookies: () => clearNativeAuthCookies(cookieStore),
    async auditFailure(input) {
      await prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: null,
          action: input.action,
          entityType: "AuthenticationAttempt",
          entityId: "rejected",
          metadata: {
            reason: input.reason,
            userAgent: input.userAgent ?? userAgent,
            ipAddress: null,
          },
        },
      });
    },
  };
}
