import { describe, expect, it, beforeEach } from "vitest";
import {
  setAuthenticationProvider,
  getAuthenticationContext,
} from "../lib/auth/server-context";
import {
  createSessionAuthenticationProvider,
  type VerifiedSessionRecord,
} from "../lib/auth/session-provider";
import { authorizeFromContext } from "../lib/auth/authorization-boundary";
import type {
  AuthorizationService,
  AuthorizationServiceRequest,
} from "@lwill/authorization-service/src/authorization-service";

const tenantId = "tenant-1";
const otherTenantId = "tenant-2";
const userId = "user-1";

function validRecord(): VerifiedSessionRecord {
  return {
    sessionId: "sess-1",
    userId,
    externalAuthId: "ext-1",
    displayName: null,
    email: null,
    tenantId,
    businessUnitId: "bu-1",
    branchId: "branch-1",
    expiresAt: new Date(Date.now() + 3_600_000),
  };
}

function allowingService(): AuthorizationService {
  return {
    async authorize() {
      return { allowed: true, matchedGrant: null };
    },
  };
}

describe("Phase 1C integration: concrete session provider -> server context -> authorization boundary", () => {
  beforeEach(() => {
    setAuthenticationProvider(null);
  });

  it("resolves an authenticated context end-to-end and authorizes using the session's own tenant", async () => {
    setAuthenticationProvider(
      createSessionAuthenticationProvider({
        async getVerifiedSession() {
          return validRecord();
        },
      }),
    );

    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(true);

    const decision = await authorizeFromContext(
      ctx,
      { permissionCode: "appointments.read", scope: { kind: "tenant", tenantId } },
      allowingService(),
    );

    expect(decision.allowed).toBe(true);
  });

  it("fails closed end-to-end when the underlying session source throws", async () => {
    setAuthenticationProvider(
      createSessionAuthenticationProvider({
        async getVerifiedSession() {
          throw new Error("upstream unavailable");
        },
      }),
    );

    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(false);

    const decision = await authorizeFromContext(
      ctx,
      { permissionCode: "appointments.read", scope: { kind: "tenant", tenantId } },
      allowingService(),
    );

    expect(decision.allowed).toBe(false);
  });

  it("denies end-to-end when the resolved session is expired", async () => {
    setAuthenticationProvider(
      createSessionAuthenticationProvider({
        async getVerifiedSession() {
          return { ...validRecord(), expiresAt: new Date(Date.now() - 1_000) };
        },
      }),
    );

    const ctx = await getAuthenticationContext();
    expect(ctx.authenticated).toBe(false);

    const decision = await authorizeFromContext(
      ctx,
      { permissionCode: "appointments.read", scope: { kind: "tenant", tenantId } },
      allowingService(),
    );

    expect(decision.allowed).toBe(false);
  });

  it("uses only the authenticated session's userId/tenantId, ignoring an attacker-controlled scope tenantId", async () => {
    setAuthenticationProvider(
      createSessionAuthenticationProvider({
        async getVerifiedSession() {
          return validRecord(); // bound to tenant-1
        },
      }),
    );

    const ctx = await getAuthenticationContext();

    const capture: { request: AuthorizationServiceRequest | null } = {
      request: null,
    };
    const capturingService: AuthorizationService = {
      async authorize(req) {
        capture.request = req;
        return { allowed: false, matchedGrant: null };
      },
    };

    await authorizeFromContext(
      ctx,
      {
        permissionCode: "appointments.read",
        scope: { kind: "tenant", tenantId: otherTenantId }, // attacker-controlled
      },
      capturingService,
    );

    expect(capture.request).not.toBeNull();
    if (capture.request !== null) {
      expect(capture.request.tenantId).toBe(tenantId);
      expect(capture.request.userId).toBe(userId);
    }
  });
});
