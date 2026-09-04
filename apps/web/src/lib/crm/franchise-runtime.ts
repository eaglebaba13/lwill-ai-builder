import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createFranchiseService } from "../../../../../packages/authentication-context-prisma/src/franchise-service";
import type {
  FranchiseAuthorization,
  FranchiseRouteServices,
} from "./franchise-route-handlers";

const franchiseService = createFranchiseService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<FranchiseAuthorization> {
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

export function createFranchiseRouteServices(): FranchiseRouteServices {
  return {
    authorize,
    listTerritories: (tenantId) => franchiseService.listTerritories({ tenantId }),
    getTerritory: (tenantId, territoryId) => franchiseService.getTerritory({ tenantId, territoryId }),
    createTerritory: (tenantId, data) => franchiseService.createTerritory({ tenantId, ...data } as never),
    listPartners: (tenantId) => franchiseService.listPartners({ tenantId }),
    getPartner: (tenantId, partnerId) => franchiseService.getPartner({ tenantId, partnerId }),
    createPartner: (tenantId, data) => franchiseService.createPartner({ tenantId, ...data } as never),
    updatePartner: (tenantId, partnerId, data) => franchiseService.updatePartner({ tenantId, partnerId, input: data } as never),
    listAgreements: (tenantId) => franchiseService.listAgreements({ tenantId }),
    getAgreement: (tenantId, agreementId) => franchiseService.getAgreement({ tenantId, agreementId }),
    createAgreement: (tenantId, data) => franchiseService.createAgreement({ tenantId, ...data } as never),
    listOutlets: (tenantId) => franchiseService.listOutlets({ tenantId }),
    getOutlet: (tenantId, outletId) => franchiseService.getOutlet({ tenantId, outletId }),
    createOutlet: (tenantId, data) => franchiseService.createOutlet({ tenantId, ...data } as never),
    getDashboard: (tenantId) => franchiseService.getDashboard({ tenantId }),
  };
}
