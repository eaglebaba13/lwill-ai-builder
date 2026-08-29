import "server-only";

export type AppointmentReportAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface AppointmentReportRouteServices {
  readonly authorize: (permissionCode: string) => Promise<AppointmentReportAuthorization>;
  readonly listAppointmentReport: (tenantId: string) => Promise<readonly unknown[]>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: AppointmentReportAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

export async function handleListAppointmentReport(
  _request: Request,
  services: AppointmentReportRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("report.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const items = await services.listAppointmentReport(authResult.tenantId);
  return response(200, { appointmentReport: items });
}
