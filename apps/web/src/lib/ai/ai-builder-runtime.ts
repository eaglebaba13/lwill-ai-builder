import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createAiProjectService } from "../../../../../packages/authentication-context-prisma/src/ai-project-service";
import { createAiSessionService } from "../../../../../packages/authentication-context-prisma/src/ai-session-service";
import { createAiPromptService } from "../../../../../packages/authentication-context-prisma/src/ai-prompt-service";
import { createModelUsageService } from "../../../../../packages/authentication-context-prisma/src/model-usage-service";
import type {
  AiBuilderAuthorization,
  AiBuilderRouteServices,
} from "./ai-builder-route-handlers";

const aiProjectService = createAiProjectService(prisma as never);
const aiSessionService = createAiSessionService(prisma as never);
const aiPromptService = createAiPromptService(prisma as never);
const modelUsageService = createModelUsageService(prisma as never);

const authService = createAuthorizationService({
  loadPermissionGrants,
});

async function authorize(permissionCode: string): Promise<AiBuilderAuthorization> {
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

export function createAiBuilderRouteServices(): AiBuilderRouteServices {
  return {
    authorize,
    createProject: (tenantId, input) => aiProjectService.createProject({ tenantId, ...input }),
    getProject: (tenantId, projectId) => aiProjectService.getProject({ tenantId, projectId }),
    listProjects: (tenantId) => aiProjectService.listProjects({ tenantId }),
    updateProject: (tenantId, projectId, input) =>
      aiProjectService.updateProject({ tenantId, projectId, input }),
    createSession: (tenantId, input) => aiSessionService.createSession({ tenantId, ...input }),
    getSession: (tenantId, sessionId) => aiSessionService.getSession({ tenantId, sessionId }),
    listSessions: (tenantId, projectId) => aiSessionService.listSessions({ tenantId, projectId }),
    recordPrompt: (tenantId, input) => aiPromptService.recordPrompt({ tenantId, ...input }),
    listPromptsForSession: (tenantId, sessionId) =>
      aiPromptService.listPromptsForSession({ tenantId, sessionId }),
    recordUsage: (tenantId, input) => modelUsageService.recordUsage({ tenantId, ...input }),
    getProjectUsageSummary: (tenantId, projectId) =>
      modelUsageService.getProjectUsageSummary({ tenantId, projectId }),
  };
}
