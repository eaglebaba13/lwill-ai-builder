import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import {
  createPlatformAuthorizationService,
  authorizePlatform,
} from "../auth/platform-authorization";
import { prisma } from "../../../../../packages/database/src/client";
import type {
  PlatformAuthorization,
  PlatformRouteServices,
} from "./platform-route-handlers";

const platformAuthService = createPlatformAuthorizationService(prisma as never);

async function authorize(permissionCode: string): Promise<PlatformAuthorization> {
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

export function createPlatformRouteServices(): PlatformRouteServices {
  return {
    authorize,
  };
}
