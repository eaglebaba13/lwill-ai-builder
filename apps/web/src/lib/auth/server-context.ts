import "server-only";
import type {
  AuthenticationContext,
  AuthenticationProvider,
} from "@lwill/authentication-context/src/types";
import { UNAUTHENTICATED } from "@lwill/authentication-context/src/unauthenticated";

/**
 * The active authentication provider.
 * Set once at application startup via setAuthenticationProvider().
 * null means no provider has been configured → always unauthenticated.
 */
let _provider: AuthenticationProvider | null = null;

/**
 * Register the authentication provider for this application.
 * Pass null to clear (used in tests; does not expose secrets).
 */
export function setAuthenticationProvider(
  provider: AuthenticationProvider | null,
): void {
  _provider = provider;
}

/**
 * Resolve the current authentication context for this request.
 *
 * Guarantees:
 *   - Never fabricates a userId or tenantId.
 *   - Returns UNAUTHENTICATED when no provider is configured.
 *   - Returns UNAUTHENTICATED when the session has expired.
 *   - Fails closed on any provider error.
 *   - Server-only: cannot be imported by client components.
 */
export async function getAuthenticationContext(): Promise<AuthenticationContext> {
  if (_provider === null) {
    return UNAUTHENTICATED;
  }

  try {
    const ctx = await _provider.getAuthenticationContext();

    if (ctx.authenticated && ctx.expiresAt <= new Date()) {
      return UNAUTHENTICATED;
    }

    return ctx;
  } catch {
    return UNAUTHENTICATED;
  }
}
