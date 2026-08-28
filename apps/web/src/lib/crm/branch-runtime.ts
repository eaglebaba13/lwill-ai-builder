import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createBranchService } from "../../../../../packages/authentication-context-prisma/src/branch-service";
import type {
  BranchAuthorization,
  BranchRouteServices,
} from "./branch-route-handlers";

const branchService = createBranchService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<BranchAuthorization> {
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

export function createBranchRouteServices(): BranchRouteServices {
  return {
    authorize,
    listBranches: (tenantId) => branchService.listBranches({ tenantId }),
    getBranch: (tenantId, branchId) => branchService.getBranch({ tenantId, branchId }),
    createBranch: (tenantId, input) => branchService.createBranch({ tenantId, ...input }),
    updateBranch: (tenantId, branchId, input) =>
      branchService.updateBranch({ tenantId, branchId, input }),
  };
}
