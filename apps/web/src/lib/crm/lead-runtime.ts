import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createLeadService } from "../../../../../packages/authentication-context-prisma/src/lead-service";
import type {
  LeadAuthorization,
  LeadRouteServices,
} from "./lead-route-handlers";

const leadService = createLeadService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<LeadAuthorization> {
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

export function createLeadRouteServices(): LeadRouteServices {
  return {
    authorize,
    listLeads: (tenantId, status) => leadService.listLeads({ tenantId, status }),
    getLead: (tenantId, leadId) => leadService.getLead({ tenantId, leadId }),
    createLead: (tenantId, input, actorUserId) =>
      leadService.createLead({ tenantId, input, actorUserId }),
    updateLead: (tenantId, leadId, input) =>
      leadService.updateLead({ tenantId, leadId, input }),
    convertLead: (tenantId, leadId, actorUserId) =>
      leadService.convertLead({ tenantId, leadId, actorUserId }),
  };
}
