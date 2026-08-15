import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearNativeAuthCookies,
  createNativeCookieResolver,
  createNativeJwt,
  createNativeVerifiedSessionSource,
  loginWithNativeCookies,
  refreshNativeSession,
  revokeAllNativeSessions,
  revokeNativeSession,
  setNativeAuthCookies,
  type NativeCookieOptions,
  type NativeCookieStore,
  type NativeRefreshPrismaClient,
} from "../lib/auth/native-auth";
import { createNativeJwtService } from "../lib/auth/native-jwt";

const now = new Date("2026-08-14T12:00:00.000Z");
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

function createJwt(overrides: Partial<{ issuer: string; audience: string; now: () => Date }> = {}) {
  return createNativeJwt({
    issuer: overrides.issuer ?? "https://auth.example.test",
    audience: overrides.audience ?? "lwill-web",
    keys: {
      active: { kid: "key-1", privateKey },
      verificationKeys: { "key-1": publicKey },
    },
    now: overrides.now ?? (() => now),
  });
}

function makeSessionPrisma(overrides: Record<string, unknown> = {}) {
  return {
    authenticationSession: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    tenantMembership: { findFirst: vi.fn() },
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    userId: "user-1",
    tenantId: null,
    expiresAt: new Date("2026-08-15T12:00:00.000Z"),
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: null,
    userAgent: null,
    ipAddress: null,
    ...overrides,
  };
}

function makeCookies(): NativeCookieStore & { values: Map<string, string>; writes: Array<{ name: string; options: NativeCookieOptions }> } {
  const values = new Map<string, string>();
  const writes: Array<{ name: string; options: NativeCookieOptions }> = [];
  return {
    values,
    writes,
    get(name) {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set(name, value, options) {
      values.set(name, value);
      writes.push({ name, options });
    },
  };
}

describe("native JWT adapter", () => {
  it("issues and verifies the ADR 013 access-token claims", () => {
    const jwt = createJwt();
    const token = jwt.issue({ userId: "user-1", sessionId: "session-1" });
    const claims = jwt.verify(token);

    expect(claims).toMatchObject({
      iss: "https://auth.example.test",
      aud: "lwill-web",
      sub: "user-1",
      sid: "session-1",
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + 900,
    });
    expect(Object.keys(claims ?? {}).sort()).toEqual([
      "aud",
      "exp",
      "iat",
      "iss",
      "jti",
      "sid",
      "sub",
    ]);
  });

  it("rejects an invalid signature", () => {
    const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const wrongJwt = createNativeJwtService({
      issuer: "https://auth.example.test",
      audience: "lwill-web",
      keys: {
        active: { kid: "key-1", privateKey: other.privateKey },
        verificationKeys: { "key-1": other.publicKey },
      },
      now: () => now,
    });
    const token = wrongJwt.issue({ userId: "user-1", sessionId: "session-1" });
    expect(createJwt().verify(token)).toBeNull();
  });

  it.each([
    ["invalid issuer", () => createJwt({ issuer: "https://other.example.test" })],
    ["invalid audience", () => createJwt({ audience: "other-app" })],
  ])("rejects %s", (_name, issuerOrOther) => {
    const token = createJwt().issue({ userId: "user-1", sessionId: "session-1" });
    expect(issuerOrOther().verify(token)).toBeNull();
  });

  it("rejects an expired JWT", () => {
    const token = createJwt().issue({ userId: "user-1", sessionId: "session-1" });
    expect(createJwt({ now: () => new Date(now.getTime() + 901_000) }).verify(token)).toBeNull();
  });
});

describe("native verified session source", () => {
  let prisma: ReturnType<typeof makeSessionPrisma>;

  beforeEach(() => {
    prisma = makeSessionPrisma();
    prisma.authenticationSession.findUnique.mockResolvedValue(makeSession());
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      displayName: "User",
      externalAuthId: null,
      isActive: true,
    });
  });

  function sourceFor(token: string) {
    return createNativeVerifiedSessionSource({
      resolveAccessToken: () => token,
      jwt: createJwt(),
      prismaOptions: { prismaClient: prisma as never, now },
    });
  }

  it("delegates a valid JWT to the existing session verifier", async () => {
    const token = createJwt().issue({ userId: "user-1", sessionId: "session-1" });
    expect(await sourceFor(token).getVerifiedSession()).toMatchObject({ sessionId: "session-1" });
    expect(prisma.authenticationSession.findUnique).toHaveBeenCalledWith({ where: { id: "session-1" } });
  });

  it.each([
    ["missing session", null, makeSessionPrisma()],
    ["revoked session", null, makeSessionPrisma({ authenticationSession: { findUnique: vi.fn().mockResolvedValue(makeSession({ revokedAt: now })) } })],
    ["expired session", null, makeSessionPrisma({ authenticationSession: { findUnique: vi.fn().mockResolvedValue(makeSession({ expiresAt: new Date("2026-08-13T12:00:00.000Z") })) } })],
    ["inactive user", null, makeSessionPrisma({ authenticationSession: { findUnique: vi.fn().mockResolvedValue(makeSession()) }, user: { findUnique: vi.fn().mockResolvedValue({ id: "user-1", isActive: false }) } })],
  ])("rejects %s", async (_name, _expected, configuredPrisma) => {
    const token = createJwt().issue({ userId: "user-1", sessionId: "session-1" });
    expect(await createNativeVerifiedSessionSource({
      resolveAccessToken: () => token,
      jwt: createJwt(),
      prismaOptions: { prismaClient: configuredPrisma as never },
    }).getVerifiedSession()).toBeNull();
  });

  it("fails closed when token resolution throws", async () => {
    const source = createNativeVerifiedSessionSource({
      resolveAccessToken: () => { throw new Error("cookie failure"); },
      jwt: createJwt(),
      prismaOptions: { prismaClient: prisma as never },
    });
    expect(await source.getVerifiedSession()).toBeNull();
  });
});

describe("native cookies and refresh lifecycle", () => {
  let cookies: ReturnType<typeof makeCookies>;
  let prisma: NativeRefreshPrismaClient;

  beforeEach(() => {
    cookies = makeCookies();
    prisma = {
      authenticationSession: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      user: { findUnique: vi.fn() },
      tenantMembership: { findFirst: vi.fn() },
      auditLog: { create: vi.fn() },
      refreshToken: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => callback(prisma)),
    } as never;
  });

  it("uses the ADR 013 cookie attributes and resolves both cookies", () => {
    setNativeAuthCookies(cookies, "access", "refresh", now);
    const resolved = createNativeCookieResolver(cookies);
    expect(resolved.resolveAccessToken()).toBe("access");
    expect(resolved.resolveRefreshToken()).toBe("refresh");
    expect(cookies.writes).toHaveLength(2);
    expect(cookies.writes[0]).toMatchObject({
      name: ACCESS_COOKIE_NAME,
      options: { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 },
    });
    expect(cookies.writes[1]).toMatchObject({
      name: REFRESH_COOKIE_NAME,
      options: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
    });
  });

  it("rejects an invalid or revoked refresh token and clears cookies", async () => {
    prisma.refreshToken.findUnique = vi.fn().mockResolvedValue(null);
    expect(await refreshNativeSession(prisma, "invalid", createJwt(), cookies, now)).toBeNull();
    expect(cookies.writes.at(-1)?.options.maxAge).toBe(0);

    prisma.refreshToken.findUnique = vi.fn().mockResolvedValue({
      id: "refresh-1", userId: "user-1", sessionId: "session-1", expiresAt: new Date("2099-01-01"), revokedAt: now,
      session: { userId: "user-1", tenantId: "tenant-1", expiresAt: new Date("2099-01-01"), revokedAt: null },
    });
    expect(await refreshNativeSession(prisma, "revoked", createJwt(), cookies, now)).toBeNull();
    expect(prisma.authenticationSession.update).toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "auth.refresh.reuse_detected" }),
    });
  });

  it("rotates a valid refresh token and revokes the presented token", async () => {
    prisma.refreshToken.findUnique = vi.fn().mockResolvedValue({
      id: "refresh-1", userId: "user-1", sessionId: "session-1", expiresAt: new Date("2026-09-01"), revokedAt: null,
      session: { userId: "user-1", tenantId: "tenant-1", expiresAt: new Date("2026-09-15"), revokedAt: null },
    });
    prisma.user.findUnique = vi.fn().mockResolvedValue({ isActive: true });
    const result = await refreshNativeSession(prisma, "refresh", createJwt(), cookies, now);
    expect(result?.accessToken).toBeTruthy();
    expect(result?.refreshToken).not.toBe("refresh");
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({ where: { id: "refresh-1" }, data: { revokedAt: now } });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "auth.refresh.succeeded" }),
    });
  });

  it("revokes one session or every session transactionally", async () => {
    prisma.authenticationSession.findUnique = vi.fn().mockResolvedValue({
      ...makeSession({ tenantId: "tenant-1" }),
    });
    await revokeNativeSession(prisma, "session-1", now);
    expect(prisma.authenticationSession.update).toHaveBeenCalledWith({ where: { id: "session-1" }, data: { revokedAt: now } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "auth.logout.succeeded" }),
    });
    await revokeAllNativeSessions(prisma, "user-1", now, undefined, "session-1");
    expect(prisma.authenticationSession.updateMany).toHaveBeenCalledWith({ where: { userId: "user-1", revokedAt: null }, data: { revokedAt: now } });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: "user-1", revokedAt: null }, data: { revokedAt: now } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "auth.logout_all.succeeded" }),
    });
  });

  it("wires the existing login service and does not duplicate credential work", async () => {
    const login = vi.fn().mockResolvedValue({
      verifiedSession: {
        sessionId: "session-1", userId: "user-1", externalAuthId: "user-1", displayName: "User", email: "user@example.com",
        tenantId: "tenant-1", businessUnitId: null, branchId: null, expiresAt: new Date("2026-09-13"),
      },
      refreshToken: "refresh",
    });
    const result = await loginWithNativeCookies(prisma as never, {
      email: "user@example.com", password: "password", tenantId: "tenant-1",
    }, createJwt(), cookies, now, login as never);
    expect(result?.accessToken).toBeTruthy();
    expect(login).toHaveBeenCalledOnce();
  });

  it("clears both cookies on logout", () => {
    clearNativeAuthCookies(cookies, now);
    expect(cookies.writes.map((write) => write.name)).toEqual([ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME]);
    expect(cookies.writes.every((write) => write.options.maxAge === 0)).toBe(true);
  });
});