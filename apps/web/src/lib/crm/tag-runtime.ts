import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createTagService } from "../../../../../packages/authentication-context-prisma/src/tag-service";
import type { TagAuthorization, TagRouteServices } from "./tag-route-handlers";

const tagService = createTagService(prisma as never);
const authService = createAuthorizationService({ loadPermissionGrants });

async function authorize(permissionCode: string): Promise<TagAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const decision = await authorizeFromContext(context, { permissionCode, scope: { kind: "tenant", tenantId: context.tenantContext.tenantId } }, authService);
  if (!decision.allowed) return { outcome: "forbidden" };
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, userId: context.user.userId };
}

export function createTagRouteServices(): TagRouteServices {
  return {
    authorize,
    listTags: (tenantId) => tagService.listTags({ tenantId }),
    getTag: (tenantId, tagId) => tagService.getTag({ tenantId, tagId }),
    createTag: (tenantId, input) => tagService.createTag({ tenantId, input }),
    linkTag: (tagId, entityType, entityId) => tagService.linkTag({ tagId, entityType, entityId }),
    unlinkTag: (tagId, entityType, entityId) => tagService.unlinkTag({ tagId, entityType, entityId }),
    listTagsForEntity: (entityType, entityId) => tagService.listTagsForEntity({ entityType, entityId }),
  };
}
