import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createFollowupService } from "../../../../../packages/authentication-context-prisma/src/followup-service";
import type {
  FollowupAuthorization,
  FollowupRouteServices,
} from "./followup-route-handlers";

const followupService = createFollowupService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<FollowupAuthorization> {
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
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, userId: context.user.userId };
}

export function createFollowupRouteServices(): FollowupRouteServices {
  return {
    authorize,
    listFollowups: (tenantId, status, leadId, customerId, opportunityId) =>
      followupService.listFollowups({ tenantId, status, leadId, customerId, opportunityId }),
    getFollowup: (tenantId, followupId) =>
      followupService.getFollowup({ tenantId, followupId }),
    createFollowup: (tenantId, input) =>
      followupService.createFollowup({ tenantId, input }),
    updateFollowup: (tenantId, followupId, input) =>
      followupService.updateFollowup({ tenantId, followupId, input }),
  };
}
