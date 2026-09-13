import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createAttachmentService } from "../../../../../packages/authentication-context-prisma/src/attachment-service";
import type { AttachmentAuthorization, AttachmentRouteServices } from "./attachment-route-handlers";

const attachmentService = createAttachmentService(prisma as never);
const authService = createAuthorizationService({ loadPermissionGrants });

async function authorize(permissionCode: string): Promise<AttachmentAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const decision = await authorizeFromContext(context, { permissionCode, scope: { kind: "tenant", tenantId: context.tenantContext.tenantId } }, authService);
  if (!decision.allowed) return { outcome: "forbidden" };
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, userId: context.user.userId };
}

export function createAttachmentRouteServices(): AttachmentRouteServices {
  return {
    authorize,
    listAttachments: (tenantId, leadId, customerId, opportunityId) => attachmentService.listAttachments({ tenantId, leadId, customerId, opportunityId }),
    getAttachment: (tenantId, attachmentId) => attachmentService.getAttachment({ tenantId, attachmentId }),
    createAttachment: (tenantId, input) => attachmentService.createAttachment({ tenantId, input }),
  };
}
