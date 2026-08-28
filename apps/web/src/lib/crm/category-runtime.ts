import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createCategoryService } from "../../../../../packages/authentication-context-prisma/src/category-service";
import type {
  CategoryAuthorization,
  CategoryRouteServices,
} from "./category-route-handlers";

const categoryService = createCategoryService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<CategoryAuthorization> {
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

export function createCategoryRouteServices(): CategoryRouteServices {
  return {
    authorize,
    listCategories: (tenantId) => categoryService.listCategories({ tenantId }),
    getCategory: (tenantId, categoryId) => categoryService.getCategory({ tenantId, categoryId }),
    createCategory: (tenantId, input) => categoryService.createCategory({ tenantId, ...input }),
    updateCategory: (tenantId, categoryId, input) =>
      categoryService.updateCategory({ tenantId, categoryId, input }),
  };
}
