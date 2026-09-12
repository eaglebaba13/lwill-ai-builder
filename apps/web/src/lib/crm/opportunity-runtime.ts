import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createOpportunityService } from "../../../../../packages/authentication-context-prisma/src/opportunity-service";
import type {
  OpportunityAuthorization,
  OpportunityRouteServices,
} from "./opportunity-route-handlers";

const opportunityService = createOpportunityService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<OpportunityAuthorization> {
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

export function createOpportunityRouteServices(): OpportunityRouteServices {
  return {
    authorize,
    listPipelines: (tenantId) => opportunityService.listPipelines({ tenantId }),
    getPipeline: (tenantId, pipelineId) => opportunityService.getPipeline({ tenantId, pipelineId }),
    createPipeline: (tenantId, name) => opportunityService.createPipeline({ tenantId, input: { name } }),
    listStages: (tenantId, pipelineId) => opportunityService.listStages({ tenantId, pipelineId }),
    createStage: (tenantId, pipelineId, name, position) =>
      opportunityService.createStage({ tenantId, input: { pipelineId, name, position } }),
    listOpportunities: (tenantId, pipelineId) => opportunityService.listOpportunities({ tenantId, pipelineId }),
    getOpportunity: (tenantId, opportunityId) => opportunityService.getOpportunity({ tenantId, opportunityId }),
    createOpportunity: (tenantId, input, actorUserId) =>
      opportunityService.createOpportunity({ tenantId, input: input as never, actorUserId }),
    updateOpportunity: (tenantId, opportunityId, input, actorUserId) =>
      opportunityService.updateOpportunity({ tenantId, opportunityId, input: input as never, actorUserId }),
    moveOpportunity: (tenantId, opportunityId, stageId, actorUserId) =>
      opportunityService.moveOpportunity({ tenantId, opportunityId, stageId, actorUserId }),
  };
}
