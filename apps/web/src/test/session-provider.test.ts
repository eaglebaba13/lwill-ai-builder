import { describe, expect, it } from "vitest";
import {
  createSessionAuthenticationProvider,
  type VerifiedSessionRecord,
  type VerifiedSessionSource,
} from "../lib/auth/session-provider";

function makeSource(
  record: VerifiedSessionRecord | null,
): VerifiedSessionSource {
  return {
    async getVerifiedSession() {
      return record;
    },
  };
}

describe("createSessionAuthenticationProvider", () => {
  it("returns an authenticated context for a valid, non-expired session", async () => {
    const record: VerifiedSessionRecord = {
      sessionId: "sess-1",
      userId: "user-1",
      externalAuthId: "ext-1",
      displayName: "Test User",
      email: "test@example.com",
      tenantId: "tenant-1",
      businessUnitId: "bu-1",
      branchId: "branch-1",
      expiresAt: new Date(Date.now() + 3_600_000),
    };

    const provider = createSessionAuthenticationProvider(makeSource(record));
    const ctx = await provider.getAuthenticationContext();

    expect(ctx.authenticated).toBe(true);
    if (ctx.authenticated) {
      expect(ctx.user.userId).toBe("user-1");
      expect(ctx.tenantContext?.tenantId).toBe("tenant-1");
      expect(ctx.tenantContext?.businessUnitId).toBe("bu-1");
      expect(ctx.tenantContext?.branchId).toBe("branch-1");
    }
  });

  it("returns unauthenticated when the source reports no session", async () => {
    const provider = createSessionAuthenticationProvider(makeSource(null));
    const ctx = await provider.getAuthenticationContext();

    expect(ctx.authenticated).toBe(false);
  });

  it("returns unauthenticated for an expired session", async () => {
    const record: VerifiedSessionRecord = {
      sessionId: "sess-expired",
      userId: "user-2",
      externalAuthId: "ext-2",
      displayName: null,
      email: null,
      tenantId: null,
      businessUnitId: null,
      branchId: null,
      expiresAt: new Date(Date.now() - 1_000),
    };

    const provider = createSessionAuthenticationProvider(makeSource(record));
    const ctx = await provider.getAuthenticationContext();

    expect(ctx.authenticated).toBe(false);
  });

  it("returns a null tenantContext when the session has no tenant selected", async () => {
    const record: VerifiedSessionRecord = {
      sessionId: "sess-3",
      userId: "user-3",
      externalAuthId: "ext-3",
      displayName: null,
      email: null,
      tenantId: null,
      businessUnitId: null,
      branchId: null,
      expiresAt: new Date(Date.now() + 3_600_000),
    };

    const provider = createSessionAuthenticationProvider(makeSource(record));
    const ctx = await provider.getAuthenticationContext();

    expect(ctx.authenticated).toBe(true);
    if (ctx.authenticated) {
      expect(ctx.tenantContext).toBeNull();
    }
  });

  it("fails closed (unauthenticated) when the session source throws", async () => {
    const throwingSource: VerifiedSessionSource = {
      async getVerifiedSession() {
        throw new Error("upstream session store unavailable");
      },
    };

    const provider = createSessionAuthenticationProvider(throwingSource);
    const ctx = await provider.getAuthenticationContext();

    expect(ctx.authenticated).toBe(false);
  });

  it("fails closed when the session source returns a malformed/invalid result", async () => {
    // Simulates an upstream integration bug returning an invalid shape at runtime.
    const invalidSource = {
      async getVerifiedSession() {
        return undefined as unknown as VerifiedSessionRecord | null;
      },
    };

    const provider = createSessionAuthenticationProvider(invalidSource);
    const ctx = await provider.getAuthenticationContext();

    expect(ctx.authenticated).toBe(false);
  });
});
