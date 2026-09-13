import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import { createOpenAIAdapter } from "../../../../../packages/authentication-context-prisma/src/openai-adapter";
import { createAiInferenceService } from "../../../../../packages/authentication-context-prisma/src/ai-inference-service";
import { createModelUsageService } from "../../../../../packages/authentication-context-prisma/src/model-usage-service";
import type { AiInferenceAuthorization, AiInferenceRouteServices } from "./ai-inference-route-handlers";

const modelUsageService = createModelUsageService(prisma as never);

const adapters = [];
const openaiKey = process.env.OPENAI_API_KEY ?? "";
if (openaiKey.length > 0) {
  adapters.push(createOpenAIAdapter({ apiKey: openaiKey, baseUrl: process.env.OPENAI_BASE_URL }));
}

const inferenceService = createAiInferenceService(adapters, modelUsageService, "openai");
const authService = createAuthorizationService({ loadPermissionGrants });

async function authorize(permissionCode: string): Promise<AiInferenceAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const decision = await authorizeFromContext(context, { permissionCode, scope: { kind: "tenant", tenantId: context.tenantContext.tenantId } }, authService);
  if (!decision.allowed) return { outcome: "forbidden" };
  return { outcome: "authorized", tenantId: context.tenantContext.tenantId, userId: context.user.userId };
}

export function createAiInferenceRouteServices(): AiInferenceRouteServices {
  return {
    authorize,
    complete: (tenantId, request) => inferenceService.complete({ tenantId, request }),
    getAvailableProviders: () => inferenceService.getAvailableProviders(),
  };
}
