import { describe, expect, it, beforeEach } from "vitest";
import {
  setAuthenticationProvider,
  getAuthenticationContext,
} from "../lib/auth/server-context";
import type {
  AuthenticationProvider,
  AuthenticationSession,
} from "@lwill/authentication-context/src/types";

describe("server authentication context", () => {
  beforeEach(() => {
    // Reset to no provider before each test to ensure isolation.
    setAuthenticationProvider(null);
  });

  it("returns unauthenticated when no provider is configured", async () => {
    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(false);
  });

  it("returns unauthenticated when the provider throws", async () => {
    const failingProvider: AuthenticationProvider = {
      async getAuthenticationContext() {
        throw new Error("upstream auth service unavailable");
      },
    };
    setAuthenticationProvider(failingProvider);

    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(false);
  });

  it("returns unauthenticated for an expired session", async () => {
    const expiredSession: AuthenticationSession = {
      sessionId: "sess-expired",
      authenticated: true,
      user: {
        userId: "user-1",
        externalAuthId: "ext-1",
        displayName: null,
        email: null,
      },
      tenantContext: null,
      expiresAt: new Date(Date.now() - 1_000), // 1 second in the past
    };

    const provider: AuthenticationProvider = {
      async getAuthenticationContext() {
        return expiredSession;
      },
    };
    setAuthenticationProvider(provider);

    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(false);
  });

  it("returns the authenticated context for a valid, non-expired session", async () => {
    const validSession: AuthenticationSession = {
      sessionId: "sess-valid",
      authenticated: true,
      user: {
        userId: "user-2",
        externalAuthId: "ext-2",
        displayName: "Test User",
        email: "test@example.com",
      },
      tenantContext: {
        tenantId: "tenant-1",
        businessUnitId: "bu-1",
        branchId: "branch-1",
      },
      expiresAt: new Date(Date.now() + 3_600_000),
    };

    const provider: AuthenticationProvider = {
      async getAuthenticationContext() {
        return validSession;
      },
    };
    setAuthenticationProvider(provider);

    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(true);
    if (ctx.authenticated) {
      expect(ctx.user.userId).toBe("user-2");
      expect(ctx.tenantContext?.tenantId).toBe("tenant-1");
    }
  });
});
