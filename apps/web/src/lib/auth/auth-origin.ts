import "server-only";

export interface OriginGuardRequest {
  readonly headers: Pick<Headers, "get">;
}

export function hasValidAuthenticationOrigin(
  request: OriginGuardRequest,
  allowedOrigin: string,
): boolean {
  try {
    const configuredOrigin = new URL(allowedOrigin);
    const requestOriginValue = request.headers.get("origin");
    if (requestOriginValue === null || requestOriginValue === "null") {
      return false;
    }

    const requestOrigin = new URL(requestOriginValue);
    if (requestOrigin.origin !== configuredOrigin.origin) {
      return false;
    }

    const fetchSite = request.headers.get("sec-fetch-site");
    return fetchSite === null || fetchSite === "same-origin";
  } catch {
    return false;
  }
}

function parseHttpsOrigin(value: string | null): URL | null {
  if (value === null || value === "null") {
    return null;
  }
  try {
    const origin = new URL(value);
    return origin.protocol === "https:" ? origin : null;
  } catch {
    return null;
  }
}

function isSameOriginFetch(request: OriginGuardRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

/**
 * Accepts the single configured origin (unchanged fast path) or any origin
 * whose hostname resolves to an active, verified TenantDomain, reusing the
 * same tenant-domain resolver already trusted for login tenant resolution.
 */
export async function hasValidMultiTenantAuthenticationOrigin(
  request: OriginGuardRequest,
  allowedOrigin: string,
  resolveOriginTenantId: (hostname: string) => Promise<string | null>,
): Promise<boolean> {
  const requestOrigin = parseHttpsOrigin(request.headers.get("origin"));
  if (requestOrigin === null || !isSameOriginFetch(request)) {
    return false;
  }

  let configuredOrigin: URL;
  try {
    configuredOrigin = new URL(allowedOrigin);
  } catch {
    return false;
  }
  if (requestOrigin.origin === configuredOrigin.origin) {
    return true;
  }

  return (await resolveOriginTenantId(requestOrigin.hostname)) !== null;
}
