import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createProductService } from "../../../../../packages/authentication-context-prisma/src/product-service";
import type {
  ProductAuthorization,
  ProductRouteServices,
} from "./product-route-handlers";

const productService = createProductService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<ProductAuthorization> {
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

export function createProductRouteServices(): ProductRouteServices {
  return {
    authorize,
    listProducts: (tenantId) => productService.listProducts({ tenantId }),
    getProduct: (tenantId, productId) => productService.getProduct({ tenantId, productId }),
    createProduct: (tenantId, input) => productService.createProduct({ tenantId, ...input }),
    updateProduct: (tenantId, productId, input) => productService.updateProduct({ tenantId, productId, input }),
  };
}
