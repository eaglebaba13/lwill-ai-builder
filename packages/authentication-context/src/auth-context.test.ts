import { describe, expect, it } from "vitest";
import { UNAUTHENTICATED } from "./unauthenticated";
import type {
  AuthenticationContext,
  AuthenticationSession,
} from "./types";

describe("authentication context contracts", () => {
  it("UNAUTHENTICATED has authenticated: false", () => {
    expect(UNAUTHENTICATED.authenticated).toBe(false);
  });

  it("unauthenticated context narrows correctly via discriminant", () => {
    const ctx: AuthenticationContext = UNAUTHENTICATED;
    if (ctx.authenticated) {
      throw new Error("should not reach authenticated branch");
    }
    expect(ctx.authenticated).toBe(false);
  });

  it("authenticated session satisfies the contract", () => {
    const session: AuthenticationSession = {
      sessionId: "sess-1",
      authenticated: true,
      user: {
        userId: "user-1",
        externalAuthId: "ext-auth-1",
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

    expect(session.authenticated).toBe(true);
    expect(session.user.userId).toBe("user-1");
    expect(session.tenantContext?.tenantId).toBe("tenant-1");
  });

  it("authenticated session allows null tenantContext", () => {
    const session: AuthenticationSession = {
      sessionId: "sess-2",
      authenticated: true,
      user: {
        userId: "user-2",
        externalAuthId: "ext-auth-2",
        displayName: null,
        email: null,
      },
      tenantContext: null,
      expiresAt: new Date(Date.now() + 3_600_000),
    };

    expect(session.tenantContext).toBeNull();
  });

  it("allows null displayName and email", () => {
    const session: AuthenticationSession = {
      sessionId: "sess-3",
      authenticated: true,
      user: {
        userId: "user-3",
        externalAuthId: "ext-auth-3",
        displayName: null,
        email: null,
      },
      tenantContext: null,
      expiresAt: new Date(Date.now() + 3_600_000),
    };

    expect(session.user.displayName).toBeNull();
    expect(session.user.email).toBeNull();
  });

  it("discriminated union narrows to authenticated branch", () => {
    const ctx: AuthenticationContext = {
      sessionId: "sess-4",
      authenticated: true,
      user: {
        userId: "user-4",
        externalAuthId: "ext-auth-4",
        displayName: null,
        email: null,
      },
      tenantContext: null,
      expiresAt: new Date(Date.now() + 3_600_000),
    };

    if (!ctx.authenticated) {
      throw new Error("expected authenticated context");
    }

    expect(ctx.user.userId).toBe("user-4");
    expect(ctx.sessionId).toBe("sess-4");
  });
});
