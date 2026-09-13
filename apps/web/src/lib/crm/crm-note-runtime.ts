import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createCrmNoteService } from "../../../../../packages/authentication-context-prisma/src/crm-note-service";
import type { CrmNoteAuthorization, CrmNoteRouteServices } from "./crm-note-route-handlers";

const noteService = createCrmNoteService(prisma as never);
const authService = createAuthorizationService({ loadPermissionGrants });

async function authorize(permissionCode: string): Promise<CrmNoteAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const decision = await authorizeFromContext(context, { permissionCode, scope: { kind: "tenant", tenantId: context.tenantContext.tenantId } }, authService);
  if (!decision.allowed) return { outcome: "forbidden" };
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, userId: context.user.userId };
}

export function createCrmNoteRouteServices(): CrmNoteRouteServices {
  return {
    authorize,
    listNotes: (tenantId, leadId, customerId, opportunityId) => noteService.listNotes({ tenantId, leadId, customerId, opportunityId }),
    getNote: (tenantId, noteId) => noteService.getNote({ tenantId, noteId }),
    createNote: (tenantId, input) => noteService.createNote({ tenantId, input }),
  };
}
