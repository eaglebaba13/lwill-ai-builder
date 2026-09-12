import "server-only";

export type OpportunityAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface OpportunityRouteServices {
  readonly authorize: (permissionCode: string) => Promise<OpportunityAuthorization>;
  readonly listPipelines: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getPipeline: (tenantId: string, pipelineId: string) => Promise<unknown | null>;
  readonly createPipeline: (tenantId: string, name: string) => Promise<unknown>;
  readonly listStages: (tenantId: string, pipelineId: string) => Promise<readonly unknown[]>;
  readonly createStage: (tenantId: string, pipelineId: string, name: string, position: number) => Promise<unknown>;
  readonly listOpportunities: (tenantId: string, pipelineId?: string) => Promise<readonly unknown[]>;
  readonly getOpportunity: (tenantId: string, opportunityId: string) => Promise<unknown | null>;
  readonly createOpportunity: (tenantId: string, input: Record<string, unknown>, actorUserId: string | null) => Promise<unknown>;
  readonly updateOpportunity: (tenantId: string, opportunityId: string, input: Record<string, unknown>, actorUserId: string | null) => Promise<unknown | null>;
  readonly moveOpportunity: (tenantId: string, opportunityId: string, stageId: string, actorUserId: string | null) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: OpportunityAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly userId: string | null } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId, userId: authorization.userId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export async function handleListPipelines(
  _request: Request,
  services: OpportunityRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;
  const pipelines = await services.listPipelines(authResult.tenantId);
  return response(200, { pipelines });
}

export async function handleCreatePipeline(
  request: Request,
  services: OpportunityRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.name)) return response(400, { error: "name is required" });

  const pipeline = await services.createPipeline(authResult.tenantId, record.name);
  return response(201, { pipeline });
}

export async function handleListStages(
  request: Request,
  services: OpportunityRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId");
  if (pipelineId === null) return response(400, { error: "pipelineId query parameter is required" });

  const stages = await services.listStages(authResult.tenantId, pipelineId);
  return response(200, { stages });
}

export async function handleCreateStage(
  request: Request,
  services: OpportunityRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.pipelineId)) return response(400, { error: "pipelineId is required" });
  if (!isNonEmptyString(record.name)) return response(400, { error: "name is required" });
  if (typeof record.position !== "number" || !Number.isInteger(record.position)) return response(400, { error: "position must be an integer" });

  try {
    const stage = await services.createStage(authResult.tenantId, record.pipelineId, record.name, record.position);
    return response(201, { stage });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("pipeline must belong")) return response(400, { error: error.message });
    throw error;
  }
}

export async function handleListOpportunities(
  request: Request,
  services: OpportunityRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId") ?? undefined;
  const opportunities = await services.listOpportunities(authResult.tenantId, pipelineId);
  return response(200, { opportunities });
}

export async function handleGetOpportunity(
  _request: Request,
  services: OpportunityRouteServices,
  opportunityId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.read");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  const opportunity = await services.getOpportunity(authResult.tenantId, opportunityId);
  if (opportunity === null) return response(404);
  return response(200, { opportunity });
}

export async function handleCreateOpportunity(
  request: Request,
  services: OpportunityRouteServices,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["pipelineId", "stageId", "name", "customerId", "leadId", "valueCents", "notes"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);
  if (!isNonEmptyString(record.pipelineId)) return response(400, { error: "pipelineId is required" });
  if (!isNonEmptyString(record.stageId)) return response(400, { error: "stageId is required" });
  if (!isNonEmptyString(record.name)) return response(400, { error: "name is required" });

  try {
    const opportunity = await services.createOpportunity(authResult.tenantId, record, authResult.userId);
    return response(201, { opportunity });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes("must belong") || error.message.includes("same pipeline"))) {
      return response(400, { error: error.message });
    }
    throw error;
  }
}

export async function handleUpdateOpportunity(
  request: Request,
  services: OpportunityRouteServices,
  opportunityId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null || Object.keys(body as object).length === 0) return response(400);
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["name", "valueCents", "notes", "status"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return response(400);

  const opportunity = await services.updateOpportunity(authResult.tenantId, opportunityId, record, authResult.userId);
  if (opportunity === null) return response(404);
  return response(200, { opportunity });
}

export async function handleMoveOpportunity(
  request: Request,
  services: OpportunityRouteServices,
  opportunityId: string,
): Promise<Response> {
  const auth = await services.authorize("customer.write");
  const authResult = authorizationOutcome(auth);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  if (typeof body !== "object" || body === null) return response(400);
  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.stageId)) return response(400, { error: "stageId is required" });

  try {
    const opportunity = await services.moveOpportunity(authResult.tenantId, opportunityId, record.stageId, authResult.userId);
    if (opportunity === null) return response(404);
    return response(200, { opportunity });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("stage must belong")) return response(400, { error: error.message });
    throw error;
  }
}
