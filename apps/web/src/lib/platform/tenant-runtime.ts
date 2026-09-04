import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import {
  createPlatformAuthorizationService,
  authorizePlatform,
} from "../auth/platform-authorization";
import { prisma } from "../../../../../packages/database/src/client";
import { createTenantService } from "../../../../../packages/authentication-context-prisma/src/tenant-management-service";
import type {
  TenantManagementAuthorization,
  TenantManagementRouteServices,
} from "./tenant-route-handlers";

const platformAuthService = createPlatformAuthorizationService(prisma as never);
const tenantService = createTenantService(prisma as never);

async function authorize(permissionCode: string): Promise<TenantManagementAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) {
    return { outcome: "unauthenticated" };
  }
  const decision = await authorizePlatform(
    context,
    permissionCode,
    platformAuthService,
  );
  if (!decision.allowed) {
    return { outcome: "forbidden" };
  }
  return { outcome: "authorized", userId: context.user.userId };
}

export function createTenantManagementRouteServices(): TenantManagementRouteServices {
  return {
    authorize,
    listTenants: () => tenantService.listTenants(),
    getTenant: (tenantId) => tenantService.getTenant({ tenantId }),
    createTenant: (data) => tenantService.createTenant(data as { name: string; slug: string }),
    updateTenant: (tenantId, data) => tenantService.updateTenant({ tenantId, input: data as { name?: string; isActive?: boolean } }),
  };
}
