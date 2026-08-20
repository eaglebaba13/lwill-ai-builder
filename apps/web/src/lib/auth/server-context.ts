import "server-only";
import type {
  AuthenticationContext,
  AuthenticationProvider,
} from "@lwill/authentication-context/src/types";
import { UNAUTHENTICATED } from "@lwill/authentication-context/src/unauthenticated";

/**
 * Symbol-keyed global provider storage.
 *
 * Next.js 16 production builds compile `instrumentation.ts` and API route
 * handlers as separate webpack entry points. A module-level `let` variable
 * in `server-context.ts` therefore exists as separate instances — one
 * per bundle. A provider registered during instrumentation startup is
 * invisible to route-handler code that reads from its own bundle copy.
 *
 * Storing the provider on `globalThis` guarantees a single shared slot
 * across all bundles in the same Node.js process.
 */
const PROVIDER_KEY = Symbol.for("__lwill_auth_provider__");

/* eslint-disable @typescript-eslint/no-explicit-any */
function readProvider(): AuthenticationProvider | null {
  return (globalThis as any)[PROVIDER_KEY] ?? null;
}

function writeProvider(
  provider: AuthenticationProvider | null,
): void {
  (globalThis as any)[PROVIDER_KEY] = provider ?? undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Register the authentication provider for this application.
 * Pass null to clear (used in tests; does not expose secrets).
 */
export function setAuthenticationProvider(
  provider: AuthenticationProvider | null,
): void {
  writeProvider(provider);
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
  const provider = readProvider();

  if (provider === null) {
    return UNAUTHENTICATED;
  }

  try {
    const ctx = await provider.getAuthenticationContext();

    if (ctx.authenticated && ctx.expiresAt <= new Date()) {
      return UNAUTHENTICATED;
    }

    return ctx;
  } catch {
    return UNAUTHENTICATED;
  }
}
