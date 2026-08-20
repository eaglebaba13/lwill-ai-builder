import { describe, expect, it, beforeEach } from "vitest";
import {
  setAuthenticationProvider,
  getAuthenticationContext,
} from "../lib/auth/server-context";
import type {
  AuthenticationProvider,
  AuthenticationSession,
} from "@lwill/authentication-context/src/types";

/**
 * The global symbol key used by server-context.ts for provider storage.
 * Kept in sync with the Symbol.for("__lwill_auth_provider__") in the
 * implementation so that tests can simulate cross-bundle access.
 */
const PROVIDER_KEY = Symbol.for("__lwill_auth_provider__");

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

  it("shares provider across separate module scopes via globalThis (cross-bundle regression)", async () => {
    // Simulate the scenario where instrumentation.ts sets the provider in
    // one webpack bundle and a route handler reads it from another bundle.
    // In production, these are separate module instances of server-context.ts,
    // but they share the same globalThis. This test proves that a provider
    // written directly to globalThis[PROVIDER_KEY] is visible to
    // getAuthenticationContext(), which reads from the same global slot.
    const crossBundleSession: AuthenticationSession = {
      sessionId: "sess-cross-bundle",
      authenticated: true,
      user: {
        userId: "user-cross",
        externalAuthId: "ext-cross",
        displayName: "Cross Bundle User",
        email: "cross@example.com",
      },
      tenantContext: {
        tenantId: "tenant-cross",
        businessUnitId: null,
        branchId: null,
      },
      expiresAt: new Date(Date.now() + 3_600_000),
    };

    const provider: AuthenticationProvider = {
      async getAuthenticationContext() {
        return crossBundleSession;
      },
    };

    // Write directly to globalThis, bypassing the module-level
    // setAuthenticationProvider — simulating what happens when
    // instrumentation.ts registers the provider in its own bundle copy.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any)[PROVIDER_KEY] = provider;

    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(true);
    if (ctx.authenticated) {
      expect(ctx.user.userId).toBe("user-cross");
      expect(ctx.tenantContext?.tenantId).toBe("tenant-cross");
    }

    // Clean up
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any)[PROVIDER_KEY];
  });

  it("clears provider when setAuthenticationProvider(null) is called", async () => {
    const provider: AuthenticationProvider = {
      async getAuthenticationContext() {
        return {
          sessionId: "sess-to-clear",
          authenticated: true,
          user: {
            userId: "user-clear",
            externalAuthId: "ext-clear",
            displayName: null,
            email: null,
          },
          tenantContext: null,
          expiresAt: new Date(Date.now() + 3_600_000),
        };
      },
    };
    setAuthenticationProvider(provider);

    const ctxBefore = await getAuthenticationContext();
    expect(ctxBefore.authenticated).toBe(true);

    setAuthenticationProvider(null);

    const ctxAfter = await getAuthenticationContext();
    expect(ctxAfter.authenticated).toBe(false);
  });
});
