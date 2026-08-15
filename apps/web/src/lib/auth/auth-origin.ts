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
