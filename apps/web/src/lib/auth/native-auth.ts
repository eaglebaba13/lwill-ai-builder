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
    readonly expiresAt: Date;
    readonly revokedAt: Date | null;
  };
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
  readonly $transaction: <T>(callback: (client: NativeRefreshPrismaClient) => Promise<T>) => Promise<T>;
}

export async function refreshNativeSession(
  prisma: NativeRefreshPrismaClient,
  refreshToken: string | null,
  jwt: NativeJwtService,
  cookies: NativeCookieStore,
  now = new Date(),
): Promise<NativeRefreshResult | null> {
  if (refreshToken === null || refreshToken.trim() === "") {
    clearNativeAuthCookies(cookies, now);
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
    await transaction.authenticationSession.update({
      where: { id: sessionId },
      data: { revokedAt: now },
    });
    await transaction.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
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
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.authenticationSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await transaction.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
  if (cookies !== undefined) {
    clearNativeAuthCookies(cookies, now);
  }
}