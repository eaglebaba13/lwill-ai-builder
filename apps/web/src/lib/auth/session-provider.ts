import "server-only";
import type {
  AuthenticationContext,
  AuthenticationProvider,
} from "@lwill/authentication-context/src/types";
import { UNAUTHENTICATED } from "@lwill/authentication-context/src/unauthenticated";

/**
 * Raw session data reported by an already-verified external session source.
 *
 * This adapter performs NO cryptographic or signature verification itself.
 * All token/session/credential verification must happen upstream in the
 * concrete authentication vendor integration that supplies this record
 * (e.g. a session-cookie service, JWT verifier, or SSO gateway). Until such
 * a vendor is integrated, no VerifiedSessionSource is wired into the app.
 */
export interface VerifiedSessionRecord {
  readonly sessionId: string;
  readonly userId: string;
  readonly externalAuthId: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly tenantId: string | null;
  readonly businessUnitId: string | null;
  readonly branchId: string | null;
  readonly expiresAt: Date;
}

/**
 * Boundary implemented by a concrete authentication vendor integration.
 * Must perform all verification and return null when no valid session
 * exists. This boundary never fabricates a session on its own.
 */
export interface VerifiedSessionSource {
  getVerifiedSession(): Promise<VerifiedSessionRecord | null>;
}

/**
 * Adapts a VerifiedSessionSource into the provider-neutral
 * AuthenticationProvider contract consumed by server-context.ts.
 *
 * Guarantees:
 *   - Performs no authentication/crypto itself; only maps an already
 *     verified record into AuthenticationContext.
 *   - Returns UNAUTHENTICATED when the source reports no session.
 *   - Returns UNAUTHENTICATED when the reported session is already expired.
 *   - Fails closed (UNAUTHENTICATED) if the source throws.
 *   - Never fabricates userId, tenantId, or any identity field.
 */
export function createSessionAuthenticationProvider(
  source: VerifiedSessionSource,
): AuthenticationProvider {
  return {
    async getAuthenticationContext(): Promise<AuthenticationContext> {
      try {
        const record = await source.getVerifiedSession();

        if (record === null) {
          return UNAUTHENTICATED;
        }

        if (record.expiresAt <= new Date()) {
          return UNAUTHENTICATED;
        }

        return {
          sessionId: record.sessionId,
          authenticated: true,
          user: {
            userId: record.userId,
            externalAuthId: record.externalAuthId,
            displayName: record.displayName,
            email: record.email,
          },
          tenantContext:
            record.tenantId === null
              ? null
              : {
                  tenantId: record.tenantId,
                  businessUnitId: record.businessUnitId,
                  branchId: record.branchId,
                },
          expiresAt: record.expiresAt,
        };
      } catch {
        return UNAUTHENTICATED;
      }
    },
  };
}
