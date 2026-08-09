import "server-only";
import type { AuthenticationContext } from "@lwill/authentication-context/src/types";
import type {
  AuthorizationService,
  AuthorizationServiceRequest,
} from "@lwill/authorization-service/src/authorization-service";
import type { AuthorizationDecision } from "@lwill/authorization/src/types";

/** Canonical denied decision returned on any failure or missing context. */
const DENIED: AuthorizationDecision = { allowed: false, matchedGrant: null };

/**
 * Evaluates an authorization request using the authenticated session context.
 *
 * Security guarantees:
 *   - Requires an authenticated session; denies unauthenticated callers.
 *   - Requires a tenant context on the session; denies when tenant is absent.
 *   - userId and tenantId are drawn exclusively from the validated session —
 *     never from client-controlled inputs.
 *   - Fails closed on any service error.
 *   - Server-only: cannot be imported by client components.
 *
 * @param context   The current authentication context (from getAuthenticationContext).
 * @param request   The permission check (permissionCode + scope) — userId/tenantId excluded.
 * @param service   The AuthorizationService instance (injected; not instantiated here).
 */
export async function authorizeFromContext(
  context: AuthenticationContext,
  request: Omit<AuthorizationServiceRequest, "userId" | "tenantId">,
  service: AuthorizationService,
): Promise<AuthorizationDecision> {
  if (!context.authenticated) {
    return DENIED;
  }

  if (context.tenantContext === null) {
    return DENIED;
  }

  try {
    return await service.authorize({
      ...request,
      userId: context.user.userId,
      tenantId: context.tenantContext.tenantId,
    });
  } catch {
    return DENIED;
  }
}
