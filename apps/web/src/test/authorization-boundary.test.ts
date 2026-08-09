import { describe, expect, it } from "vitest";
import { authorizeFromContext } from "../lib/auth/authorization-boundary";
import type {
  AuthenticationContext,
  AuthenticationSession,
} from "@lwill/authentication-context/src/types";
import type {
  AuthorizationService,
  AuthorizationServiceRequest,
} from "@lwill/authorization-service/src/authorization-service";
import type { AuthorizationDecision } from "@lwill/authorization/src/types";

const tenantId = "tenant-1";
const otherTenantId = "tenant-2";
const userId = "user-1";
const businessUnitId = "bu-1";
const branchId = "branch-1";

function makeService(decision: AuthorizationDecision): AuthorizationService {
  return {
    async authorize() {
      return decision;
    },
  };
}

const allowedService = makeService({ allowed: true, matchedGrant: null });

function validSession(): AuthenticationSession {
  return {
    sessionId: "sess-1",
    authenticated: true,
    user: {
      userId,
      externalAuthId: "ext-1",
      displayName: null,
      email: null,
    },
    tenantContext: {
      tenantId,
      businessUnitId,
      branchId,
    },
    expiresAt: new Date(Date.now() + 3_600_000),
  };
}

function baseRequest(): Omit<AuthorizationServiceRequest, "userId" | "tenantId"> {
  return {
    permissionCode: "appointments.read",
    scope: { kind: "tenant", tenantId },
  };
}

describe("authorization boundary", () => {
  it("denies unauthenticated context", async () => {
    const ctx: AuthenticationContext = { authenticated: false };
    const result = await authorizeFromContext(ctx, baseRequest(), allowedService);
    expect(result.allowed).toBe(false);
  });

  it("denies authenticated context with null tenant context (missing tenant)", async () => {
    const ctx: AuthenticationContext = {
      ...validSession(),
      tenantContext: null,
    };
    const result = await authorizeFromContext(ctx, baseRequest(), allowedService);
    expect(result.allowed).toBe(false);
  });

  it("allows authenticated context with valid tenant context", async () => {
    const ctx: AuthenticationContext = validSession();
    const result = await authorizeFromContext(ctx, baseRequest(), allowedService);
    expect(result.allowed).toBe(true);
  });

  it("denies when the authorization service returns denied", async () => {
    const ctx: AuthenticationContext = validSession();
    const deniedService = makeService({ allowed: false, matchedGrant: null });
    const result = await authorizeFromContext(ctx, baseRequest(), deniedService);
    expect(result.allowed).toBe(false);
  });

  it("fails closed when the authorization service throws", async () => {
    const ctx: AuthenticationContext = validSession();
    const throwingService: AuthorizationService = {
      async authorize() {
        throw new Error("service unavailable");
      },
    };
    const result = await authorizeFromContext(ctx, baseRequest(), throwingService);
    expect(result.allowed).toBe(false);
  });

  it("passes userId and tenantId from the authenticated session to the service", async () => {
    // Container object avoids TypeScript narrowing the variable to `never` after an async boundary.
    const capture: { request: AuthorizationServiceRequest | null } = { request: null };
    const capturingService: AuthorizationService = {
      async authorize(req) {
        capture.request = req;
        return { allowed: true, matchedGrant: null };
      },
    };

    const ctx: AuthenticationContext = validSession();
    await authorizeFromContext(ctx, baseRequest(), capturingService);

    expect(capture.request).not.toBeNull();
    if (capture.request !== null) {
      expect(capture.request.userId).toBe(userId);
      expect(capture.request.tenantId).toBe(tenantId);
    }
  });

  it("does not allow client-controlled tenant escalation", async () => {
    // Even if the request scope targets a different tenant, the tenantId
    // forwarded to the service's grant loader must come from the session.
    const capture: { request: AuthorizationServiceRequest | null } = { request: null };
    const capturingService: AuthorizationService = {
      async authorize(req) {
        capture.request = req;
        return { allowed: false, matchedGrant: null };
      },
    };

    const ctx: AuthenticationContext = validSession(); // session bound to tenant-1

    const attackerRequest: Omit<AuthorizationServiceRequest, "userId" | "tenantId"> = {
      permissionCode: "appointments.read",
      scope: { kind: "tenant", tenantId: otherTenantId }, // attacker-controlled scope
    };

    await authorizeFromContext(ctx, attackerRequest, capturingService);

    // tenantId in the service request must be from the session (tenant-1), not from the scope
    if (capture.request !== null) {
      expect(capture.request.tenantId).toBe(tenantId);
    } else {
      throw new Error("expected authorization service to be called");
    }
  });
});
