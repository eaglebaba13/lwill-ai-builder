import { describe, expect, it } from "vitest";
import {
  createAuthorizationService,
  type AuthorizationServiceRequest,
} from "./authorization-service";
import type { PermissionGrant } from "@lwill/authorization/src/types";
import type {
  GrantLoaderInput,
  PermissionGrantLoader,
} from "@lwill/authorization-prisma/src/types";

const tenantId = "tenant-1";
const otherTenantId = "tenant-2";
const userId = "user-1";
const businessUnitId = "bu-1";
const branchId = "branch-1";

function createLoader(
  grants: readonly PermissionGrant[],
  onLoad?: (input: GrantLoaderInput) => void,
): PermissionGrantLoader {
  return {
    async loadPermissionGrants(input) {
      onLoad?.(input);
      return grants;
    },
  };
}

function request(
  overrides: Partial<AuthorizationServiceRequest> = {},
): AuthorizationServiceRequest {
  return {
    userId,
    tenantId,
    permissionCode: "appointments.read",
    scope: {
      kind: "tenant",
      tenantId,
    },
    ...overrides,
  };
}

describe("authorization service", () => {
  it("allows a valid tenant grant", async () => {
    const service = createAuthorizationService(
      createLoader([
        {
          permissionCode: "appointments.read",
          scope: {
            kind: "tenant",
            tenantId,
          },
        },
      ]),
    );

    const decision = await service.authorize(request());

    expect(decision.allowed).toBe(true);
    expect(decision.matchedGrant).not.toBeNull();
  });

  it("allows tenant grant inheritance to business-unit scope", async () => {
    const service = createAuthorizationService(
      createLoader([
        {
          permissionCode: "appointments.read",
          scope: {
            kind: "tenant",
            tenantId,
          },
        },
      ]),
    );

    const decision = await service.authorize(
      request({
        scope: {
          kind: "business-unit",
          tenantId,
          businessUnitId,
        },
      }),
    );

    expect(decision.allowed).toBe(true);
  });

  it("allows a valid business-unit grant", async () => {
    const service = createAuthorizationService(
      createLoader([
        {
          permissionCode: "appointments.read",
          scope: {
            kind: "business-unit",
            tenantId,
            businessUnitId,
          },
        },
      ]),
    );

    const decision = await service.authorize(
      request({
        scope: {
          kind: "business-unit",
          tenantId,
          businessUnitId,
        },
      }),
    );

    expect(decision.allowed).toBe(true);
  });

  it("allows an exact branch grant", async () => {
    const service = createAuthorizationService(
      createLoader([
        {
          permissionCode: "appointments.read",
          scope: {
            kind: "branch",
            tenantId,
            businessUnitId,
            branchId,
          },
        },
      ]),
    );

    const decision = await service.authorize(
      request({
        scope: {
          kind: "branch",
          tenantId,
          businessUnitId,
          branchId,
        },
      }),
    );

    expect(decision.allowed).toBe(true);
  });

  it("denies cross-tenant access", async () => {
    const service = createAuthorizationService(
      createLoader([
        {
          permissionCode: "appointments.read",
          scope: {
            kind: "tenant",
            tenantId,
          },
        },
      ]),
    );

    const decision = await service.authorize(
      request({
        tenantId: otherTenantId,
        scope: {
          kind: "tenant",
          tenantId: otherTenantId,
        },
      }),
    );

    expect(decision.allowed).toBe(false);
    expect(decision.matchedGrant).toBeNull();
  });

  it("passes the requested tenant and user to the grant loader", async () => {
    let received: GrantLoaderInput | null = null;

    const service = createAuthorizationService(
      createLoader([], (input) => {
        received = input;
      }),
    );

    await service.authorize(request());

    expect(received).toEqual({
      tenantId,
      userId,
    });
  });

  it("fails closed when the grant loader throws", async () => {
    const loader: PermissionGrantLoader = {
      async loadPermissionGrants() {
        throw new Error("database unavailable");
      },
    };

    const service = createAuthorizationService(loader);

    const decision = await service.authorize(request());

    expect(decision).toEqual({
      allowed: false,
      matchedGrant: null,
    });
  });
});
