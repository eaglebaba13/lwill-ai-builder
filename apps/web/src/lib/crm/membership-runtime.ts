import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createMembershipService } from "../../../../../packages/authentication-context-prisma/src/membership-service";
import type {
  MembershipAuthorization,
  MembershipRouteServices,
} from "./membership-route-handlers";

const membershipService = createMembershipService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<MembershipAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) {
    return { outcome: "unauthenticated" };
  }
  if (context.tenantContext === null) {
    return { outcome: "forbidden" };
  }
  const decision = await authorizeFromContext(
    context,
    {
      permissionCode,
      scope: { kind: "tenant", tenantId: context.tenantContext.tenantId },
    },
    authService,
  );
  if (!decision.allowed) {
    return { outcome: "forbidden" };
  }
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId };
}

export function createMembershipRouteServices(): MembershipRouteServices {
  return {
    authorize,
    listMemberships: (tenantId) => membershipService.listMemberships({ tenantId }),
    getMembership: (tenantId, membershipId) => membershipService.getMembership({ tenantId, membershipId }),
    createMembership: (tenantId, input) => membershipService.createMembership({ tenantId, ...input }),
  };
}
