/** Verified identity of an authenticated user. */
export interface AuthenticatedUser {
  readonly userId: string;
  readonly externalAuthId: string;
  readonly displayName: string | null;
  readonly email: string | null;
}

/**
 * Tenant hierarchy context bound to the authenticated session.
 * Only fields present in the session are set; null means not selected.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly businessUnitId: string | null;
  readonly branchId: string | null;
}

/** An active, non-expired, authenticated session. */
export interface AuthenticationSession {
  readonly sessionId: string;
  readonly authenticated: true;
  readonly user: AuthenticatedUser;
  readonly tenantContext: TenantContext | null;
  readonly expiresAt: Date;
}

/** No valid session is present. */
export interface UnauthenticatedSession {
  readonly authenticated: false;
}

/** Discriminated union of all possible authentication states. */
export type AuthenticationContext = AuthenticationSession | UnauthenticatedSession;

/**
 * Provider-neutral interface for resolving the current authentication context.
 * Concrete implementations supply the auth vendor (e.g., JWT, session cookie).
 */
export interface AuthenticationProvider {
  getAuthenticationContext(): Promise<AuthenticationContext>;
}
