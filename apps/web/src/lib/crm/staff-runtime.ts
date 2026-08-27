import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createStaffService } from "../../../../../packages/authentication-context-prisma/src/staff-service";
import type {
  StaffAuthorization,
  StaffRouteServices,
} from "./staff-route-handlers";

const staffService = createStaffService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<StaffAuthorization> {
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

export function createStaffRouteServices(): StaffRouteServices {
  return {
    authorize,
    listStaff: (tenantId) => staffService.listStaff({ tenantId }),
    getStaff: (tenantId, staffId) => staffService.getStaff({ tenantId, staffId }),
    createStaff: (tenantId, input) => staffService.createStaff({ tenantId, ...input }),
    updateStaff: (tenantId, staffId, input) =>
      staffService.updateStaff({ tenantId, staffId, input }),
  };
}
