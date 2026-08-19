import "server-only";
import crypto from "node:crypto";
import type { VerifiedSessionRecord, VerifiedSessionSource } from "./session-provider";
import {
  createPrismaVerifiedSessionSource,
  type PrismaSessionClient,
  type PrismaSessionSourceOptions,
} from "./prisma-session-source";
import { createTokenHash } from "../../../../../packages/authentication-context-prisma/src/auth-persistence";
import type { AuthenticationProvider } from "@lwill/authentication-context/src/types";
import {
  createNativeJwtService,
  type NativeJwtOptions,
  type NativeJwtService,
} from "./native-jwt";
import {
  loginWithEmailPassword,
  type LoginPrismaClient,
} from "./login-service";
import { createSessionAuthenticationProvider } from "./session-provider";

export const ACCESS_COOKIE_NAME = "lwill_access";
export const REFRESH_COOKIE_NAME = "lwill_refresh";
export const REFRESH_TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export interface NativeCookieOptions {
  readonly httpOnly: true;
  readonly secure: true;
  readonly sameSite: "lax";
  readonly path: "/";
  readonly maxAge: number;
  readonly expires: Date;
}

export interface NativeCookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: NativeCookieOptions): void;
}

export function createNativeCookieResolver(store: NativeCookieStore) {
  return {
    resolveAccessToken: () => store.get(ACCESS_COOKIE_NAME)?.value ?? null,
    resolveRefreshToken: () => store.get(REFRESH_COOKIE_NAME)?.value ?? null,
  };
}

export function setNativeAuthCookies(
  store: NativeCookieStore,
  accessToken: string,
  refreshToken: string,
  now = new Date(),
  refreshTokenExpiresAt = new Date(
    now.getTime() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000,
  ),
): void {
  const accessTokenExpiresAt = new Date(
    now.getTime() + 15 * 60 * 1000,
  );
  store.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((accessTokenExpiresAt.getTime() - now.getTime()) / 1000)),
    expires: accessTokenExpiresAt,
  });
  store.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((refreshTokenExpiresAt.getTime() - now.getTime()) / 1000)),
    expires: refreshTokenExpiresAt,
  });
}

export function clearNativeAuthCookies(store: NativeCookieStore, now = new Date()): void {
  const options: NativeCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: now,
  };
  store.set(ACCESS_COOKIE_NAME, "", options);
  store.set(REFRESH_COOKIE_NAME, "", options);
}

export interface NativeVerifiedSessionSourceOptions {
  readonly resolveAccessToken: () => Promise<string | null> | string | null;
  readonly jwt: NativeJwtService;
  readonly prismaOptions?: Omit<PrismaSessionSourceOptions, "resolveSessionId">;
}

export function createNativeVerifiedSessionSource(
  options: NativeVerifiedSessionSourceOptions,
): VerifiedSessionSource {
  return {
    async getVerifiedSession(): Promise<VerifiedSessionRecord | null> {
      try {
        const token = await options.resolveAccessToken();
        if (token === null || token.trim() === "") {
          return null;
        }
        const claims = options.jwt.verify(token);
        if (claims === null) {
          return null;
        }
        const source = createPrismaVerifiedSessionSource({
          ...options.prismaOptions,
          resolveSessionId: () => claims.sid,
        });
        const session = await source.getVerifiedSession();
        return session !== null && session.userId === claims.sub ? session : null;
      } catch {
        return null;
      }
    },
  };
}

export function createNativePrismaSessionAuthenticationProvider(
  options: NativeVerifiedSessionSourceOptions,
): AuthenticationProvider {
  return createSessionAuthenticationProvider(
    createNativeVerifiedSessionSource(options),
  );
}

export function createNativeJwt(options: NativeJwtOptions): NativeJwtService {
  return createNativeJwtService(options);
}

export interface NativeLoginInput {
  readonly email: string;
  readonly password: string;
  readonly tenantId: string;
  readonly userAgent?: string | null;
  readonly ipAddress?: string | null;
}

export interface NativeLoginResult {
  readonly verifiedSession: VerifiedSessionRecord;
  readonly refreshToken: string;
  readonly accessToken: string;
}

export interface NativeRefreshResult {
  readonly refreshToken: string;
  readonly accessToken: string;
}

export async function loginWithNativeCookies(
  prisma: LoginPrismaClient,
  input: NativeLoginInput,
  jwt: NativeJwtService,
  cookies: NativeCookieStore,
  now = new Date(),
  login = loginWithEmailPassword,
): Promise<NativeLoginResult | null> {
  const sessionExpiresAt = new Date(
    now.getTime() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000,
  );
  const result = await login(prisma, {
    ...input,
    expiresAt: sessionExpiresAt,
    refreshTokenExpiresAt: sessionExpiresAt,
  });
  if (result === null) {
    return null;
  }
  const accessToken = jwt.issue({
    userId: result.verifiedSession.userId,
    sessionId: result.verifiedSession.sessionId,
  });
  setNativeAuthCookies(cookies, accessToken, result.refreshToken, now, sessionExpiresAt);
  return { ...result, accessToken };
}

interface RefreshTokenRecord {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly session: {
    readonly userId: string;
    readonly tenantId: string | null;
    readonly expiresAt: Date;
    readonly revokedAt: Date | null;
  };
}

interface NativeAuditInput {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface NativeRefreshPrismaClient extends PrismaSessionClient {
  readonly refreshToken: {
    findUnique: (args: {
      where: { tokenHash: string };
      include: { session: true };
    }) => Promise<RefreshTokenRecord | null>;
    update: (args: { where: { id: string }; data: { revokedAt: Date } }) => Promise<unknown>;
    create: (args: {
      data: { userId: string; sessionId: string; tokenHash: string; expiresAt: Date };
    }) => Promise<unknown>;
    updateMany: (args: {
      where: { sessionId?: string; userId?: string; revokedAt: null };
      data: { revokedAt: Date };
    }) => Promise<unknown>;
  };
  readonly authenticationSession: PrismaSessionClient["authenticationSession"] & {
    update: (args: { where: { id: string }; data: { revokedAt: Date } }) => Promise<unknown>;
    updateMany: (args: {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: Date };
    }) => Promise<unknown>;
  };
  readonly user: PrismaSessionClient["user"] & {
    findUnique: (args: { where: { id: string } }) => Promise<{ isActive: boolean } | null>;
  };
  readonly auditLog: {
    create: (args: { data: NativeAuditInput }) => Promise<unknown>;
  };
  readonly $transaction: <T>(callback: (client: NativeRefreshPrismaClient) => Promise<T>) => Promise<T>;
}

export async function resolveNativeAccessSession(
  prisma: PrismaSessionClient,
  accessToken: string | null,
  jwt: NativeJwtService,
): Promise<VerifiedSessionRecord | null> {
  if (accessToken === null || accessToken.trim() === "") {
    return null;
  }
  return createNativeVerifiedSessionSource({
    resolveAccessToken: () => accessToken,
    jwt,
    prismaOptions: { prismaClient: prisma },
  }).getVerifiedSession();
}

export async function resolveNativeRefreshSession(
  prisma: NativeRefreshPrismaClient,
  refreshToken: string | null,
  now = new Date(),
): Promise<{ sessionId: string; userId: string; tenantId: string } | null> {
  if (refreshToken === null || refreshToken.trim() === "") {
    return null;
  }
  try {
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: createTokenHash(refreshToken) },
      include: { session: true },
    });
    const user = stored === null
      ? null
      : await prisma.user.findUnique({ where: { id: stored.userId } });
    if (
      stored === null ||
      user === null ||
      !user.isActive ||
      stored.revokedAt !== null ||
      stored.expiresAt <= now ||
      stored.session.revokedAt !== null ||
      stored.session.expiresAt <= now ||
      stored.session.userId !== stored.userId ||
      stored.session.tenantId === null
    ) {
      return null;
    }
    return {
      sessionId: stored.sessionId,
      userId: stored.userId,
      tenantId: stored.session.tenantId,
    };
  } catch {
    return null;
  }
}

export async function refreshNativeSession(
  prisma: NativeRefreshPrismaClient,
  refreshToken: string | null,
  jwt: NativeJwtService,
  cookies: NativeCookieStore,
  now = new Date(),
): Promise<NativeRefreshResult | null> {
  if (refreshToken === null || refreshToken.trim() === "") {
    // Do not clear cookies here. A null/empty refresh token means the browser
    // already has no refresh cookie, so clearing is unnecessary. More
    // importantly, clearing cookies here creates a race condition: the initial
    // page-mount refresh request (sent before login) may return after a
    // concurrent login has already set fresh cookies. If the stale refresh
    // response clears those cookies, the next authenticated fetch (e.g.
    // /api/customers) arrives without credentials and returns 401, causing
    // the client to log the user out immediately after login.
    return null;
  }

  let result: {
    readonly refreshToken: string;
    readonly accessToken: string;
    readonly expiresAt: Date;
    readonly userId: string;
    readonly sessionId: string;
  } | null;
  try {
    result = await prisma.$transaction(async (transaction) => {
    const stored = await transaction.refreshToken.findUnique({
      where: { tokenHash: createTokenHash(refreshToken) },
      include: { session: true },
    });
    if (stored === null) {
      return null;
    }

    if (stored.revokedAt !== null) {
      await transaction.authenticationSession.update({
        where: { id: stored.sessionId },
        data: { revokedAt: now },
      });
      await transaction.refreshToken.updateMany({
        where: { sessionId: stored.sessionId, revokedAt: null },
        data: { revokedAt: now },
      });
      if (stored.session.tenantId !== null) {
        await transaction.auditLog.create({
          data: {
            tenantId: stored.session.tenantId,
            actorUserId: stored.userId,
            action: "auth.refresh.reuse_detected",
            entityType: "AuthenticationSession",
            entityId: stored.sessionId,
            metadata: { sessionId: stored.sessionId, reason: "revoked_refresh_token" },
          },
        });
      }
      return null;
    }

    const user = await transaction.user.findUnique({ where: { id: stored.userId } });
    if (
      user === null ||
      !user.isActive ||
      stored.session.userId !== stored.userId ||
      stored.session.revokedAt !== null ||
      stored.expiresAt <= now ||
      stored.session.expiresAt <= now
    ) {
      return null;
    }

    const replacementToken = crypto.randomUUID();
    const replacementExpiresAt = new Date(
      Math.min(stored.expiresAt.getTime(), stored.session.expiresAt.getTime()),
    );
    await transaction.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: now },
    });
    await transaction.refreshToken.create({
      data: {
        userId: stored.userId,
        sessionId: stored.sessionId,
        tokenHash: createTokenHash(replacementToken),
        expiresAt: replacementExpiresAt,
      },
    });
    if (stored.session.tenantId !== null) {
      await transaction.auditLog.create({
        data: {
          tenantId: stored.session.tenantId,
          actorUserId: stored.userId,
          action: "auth.refresh.succeeded",
          entityType: "AuthenticationSession",
          entityId: stored.sessionId,
          metadata: { sessionId: stored.sessionId },
        },
      });
    }
    return {
      refreshToken: replacementToken,
      accessToken: jwt.issue({ userId: stored.userId, sessionId: stored.sessionId }),
      expiresAt: replacementExpiresAt,
      userId: stored.userId,
      sessionId: stored.sessionId,
    };
    });
  } catch {
    clearNativeAuthCookies(cookies, now);
    return null;
  }

  if (result === null) {
    clearNativeAuthCookies(cookies, now);
    return null;
  }

  setNativeAuthCookies(cookies, result.accessToken, result.refreshToken, now, result.expiresAt);
  return { accessToken: result.accessToken, refreshToken: result.refreshToken };
}

export async function revokeNativeSession(
  prisma: NativeRefreshPrismaClient,
  sessionId: string,
  now = new Date(),
  cookies?: NativeCookieStore,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const session = await transaction.authenticationSession.findUnique({
      where: { id: sessionId },
    });
    await transaction.authenticationSession.update({
      where: { id: sessionId },
      data: { revokedAt: now },
    });
    await transaction.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
    if (session?.tenantId !== null && session?.tenantId !== undefined) {
      await transaction.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorUserId: session.userId,
          action: "auth.logout.succeeded",
          entityType: "AuthenticationSession",
          entityId: session.id,
          metadata: { sessionId: session.id },
        },
      });
    }
  });
  if (cookies !== undefined) {
    clearNativeAuthCookies(cookies, now);
  }
}

export async function revokeAllNativeSessions(
  prisma: NativeRefreshPrismaClient,
  userId: string,
  now = new Date(),
  cookies?: NativeCookieStore,
  currentSessionId?: string,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const currentSession = currentSessionId === undefined
      ? null
      : await transaction.authenticationSession.findUnique({
          where: { id: currentSessionId },
        });
    await transaction.authenticationSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await transaction.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    if (currentSession?.tenantId !== null && currentSession?.tenantId !== undefined) {
      await transaction.auditLog.create({
        data: {
          tenantId: currentSession.tenantId,
          actorUserId: userId,
          action: "auth.logout_all.succeeded",
          entityType: "User",
          entityId: userId,
          metadata: { sessionId: currentSession.id },
        },
      });
    }
  });
  if (cookies !== undefined) {
    clearNativeAuthCookies(cookies, now);
  }
}