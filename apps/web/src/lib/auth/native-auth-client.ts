export interface NativeLoginCredentials {
  readonly email: string;
  readonly password: string;
}

export async function loginWithNativeAuthentication(
  credentials: NativeLoginCredentials,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetcher("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(credentials),
  });
  return response.ok;
}

/**
 * Single-flight deduplication: if a refresh request is already in flight,
 * subsequent callers receive the same promise instead of sending a duplicate
 * HTTP request. This prevents concurrent restoreAuthentication() triggers
 * (mount + pageshow) from presenting the same refresh token twice, which
 * would cause the server's reuse detector to revoke the session.
 */
let inflightRefresh: Promise<boolean> | null = null;

export function restoreNativeAuthentication(
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (inflightRefresh !== null) {
    return inflightRefresh;
  }
  inflightRefresh = fetcher("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  })
    .then((response) => response.ok)
    .finally(() => {
      inflightRefresh = null;
    });
  return inflightRefresh;
}

/**
 * Invalidate any in-flight refresh so that its result does not interfere
 * with a subsequent login. Call this before starting a login request.
 *
 * The in-flight HTTP request still completes on the server, but no new
 * callers will join it, and its stale promise reference is released.
 */
export function invalidatePendingRefresh(): void {
  inflightRefresh = null;
}

export async function logoutFromNativeAuthentication(
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetcher("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  return response.ok;
}
