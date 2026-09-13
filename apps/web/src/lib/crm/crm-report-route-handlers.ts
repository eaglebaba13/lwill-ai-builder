import "server-only";

export type CrmReportAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface CrmReportRouteServices {
  readonly authorize: (permissionCode: string) => Promise<CrmReportAuthorization>;
  readonly getLeadSourceReport: (tenantId: string) => Promise<unknown>;
  readonly getSalesFunnel: (tenantId: string) => Promise<unknown>;
  readonly getConversionReport: (tenantId: string) => Promise<unknown>;
  readonly getPendingFollowups: (tenantId: string) => Promise<unknown>;
  readonly getCustomerGrowth: (tenantId: string) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: RESPONSE_HEADERS });
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(auth: CrmReportAuthorization): { readonly ok: true; readonly tenantId: string; readonly userId: string | null } | { readonly ok: false; readonly response: Response } {
  if (auth.outcome === "unauthenticated") return { ok: false, response: response(401) };
  if (auth.outcome === "forbidden") return { ok: false, response: response(403) };
  return { ok: true, tenantId: auth.tenantId, userId: auth.userId };
}

export async function handleGetLeadSourceReport(_request: Request, services: CrmReportRouteServices): Promise<Response> {
  const auth = await services.authorize("report.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const data = await services.getLeadSourceReport(r.tenantId);
  return response(200, data);
}

export async function handleGetSalesFunnel(_request: Request, services: CrmReportRouteServices): Promise<Response> {
  const auth = await services.authorize("report.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const data = await services.getSalesFunnel(r.tenantId);
  return response(200, data);
}

export async function handleGetConversionReport(_request: Request, services: CrmReportRouteServices): Promise<Response> {
  const auth = await services.authorize("report.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const data = await services.getConversionReport(r.tenantId);
  return response(200, data);
}

export async function handleGetPendingFollowups(_request: Request, services: CrmReportRouteServices): Promise<Response> {
  const auth = await services.authorize("report.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const data = await services.getPendingFollowups(r.tenantId);
  return response(200, data);
}

export async function handleGetCustomerGrowth(_request: Request, services: CrmReportRouteServices): Promise<Response> {
  const auth = await services.authorize("report.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const data = await services.getCustomerGrowth(r.tenantId);
  return response(200, data);
}
