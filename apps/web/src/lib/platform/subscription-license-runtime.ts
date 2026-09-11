import "server-only";
import { getAuthenticationContext } from "../auth/server-context";
import {
  createPlatformAuthorizationService,
  authorizePlatform,
} from "../auth/platform-authorization";
import { prisma } from "../../../../../packages/database/src/client";
import { createSubscriptionLicenseService } from "../../../../../packages/authentication-context-prisma/src/subscription-license-service";
import type {
  SubscriptionLicenseAuthorization,
  SubscriptionLicenseRouteServices,
} from "./subscription-license-route-handlers";

const platformAuthService = createPlatformAuthorizationService(prisma as never);
const subscriptionLicenseService = createSubscriptionLicenseService(prisma as never);

async function authorize(permissionCode: string): Promise<SubscriptionLicenseAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) {
    return { outcome: "unauthenticated" };
  }
  const decision = await authorizePlatform(context, permissionCode, platformAuthService);
  if (!decision.allowed) {
    return { outcome: "forbidden" };
  }
  return { outcome: "authorized", userId: context.user.userId };
}

export function createSubscriptionLicenseRouteServices(): SubscriptionLicenseRouteServices {
  return {
    authorize,
    getSubscription: (tenantId) => subscriptionLicenseService.getSubscription({ tenantId }),
    createSubscription: (tenantId, input, actorUserId) =>
      subscriptionLicenseService.createSubscription({ tenantId, input: input as never, actorUserId }),
    updateSubscription: (tenantId, input, actorUserId) =>
      subscriptionLicenseService.updateSubscription({ tenantId, input: input as never, actorUserId }),
    getLicense: (tenantId) => subscriptionLicenseService.getLicense({ tenantId }),
    createLicense: (tenantId, input, actorUserId) =>
      subscriptionLicenseService.createLicense({ tenantId, input: input as never, actorUserId }),
    updateLicense: (tenantId, input, actorUserId) =>
      subscriptionLicenseService.updateLicense({ tenantId, input: input as never, actorUserId }),
  };
}
