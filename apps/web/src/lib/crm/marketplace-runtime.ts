import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createMarketplaceService } from "../../../../../packages/authentication-context-prisma/src/marketplace-service";
import type {
  MarketplaceAuthorization,
  MarketplaceRouteServices,
} from "./marketplace-route-handlers";

const marketplaceService = createMarketplaceService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<MarketplaceAuthorization> {
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

export function createMarketplaceRouteServices(): MarketplaceRouteServices {
  return {
    authorize,
    listAssets: (args) => marketplaceService.listAssets(args),
    getAsset: (args) => marketplaceService.getAsset(args),
    createAsset: (input) => marketplaceService.createAsset(input),
    listVersions: (args) => marketplaceService.listVersions(args),
    createVersion: (args) => marketplaceService.createVersion(args),
    listInstallations: (tenantId) => marketplaceService.listInstallations({ tenantId }),
    installAsset: (tenantId, input) => marketplaceService.installAsset({ tenantId, ...input }),
    uninstallAsset: (tenantId, assetId, actorUserId) => marketplaceService.uninstallAsset({ tenantId, assetId, actorUserId }),
  };
}
