import "server-only";

export type PlatformAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly userId: string };

export interface PlatformRouteServices {
  readonly authorize: (permissionCode: string) => Promise<PlatformAuthorization>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: PlatformAuthorization,
): { readonly ok: true; readonly userId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, userId: authorization.userId };
}

export async function handleGetPlatformHealth(
  _request: Request,
  services: PlatformRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("platform.manage");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  return response(200, { status: "ok", scope: "platform" });
}
