import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createReorderRuleService } from "../../../../../packages/authentication-context-prisma/src/reorder-rule-service";
import type {
  ReorderRuleAuthorization,
  ReorderRuleRouteServices,
} from "./reorder-rule-route-handlers";

const reorderRuleService = createReorderRuleService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<ReorderRuleAuthorization> {
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

export function createReorderRuleRouteServices(): ReorderRuleRouteServices {
  return {
    authorize,
    listReorderRules: (tenantId) => reorderRuleService.listReorderRules({ tenantId }),
    getReorderRule: (tenantId, reorderRuleId) =>
      reorderRuleService.getReorderRule({ tenantId, reorderRuleId }),
    createReorderRule: (tenantId, input) => reorderRuleService.createReorderRule({ tenantId, ...input }),
    updateReorderRule: (tenantId, reorderRuleId, input) =>
      reorderRuleService.updateReorderRule({ tenantId, reorderRuleId, input }),
  };
}
