import "server-only";

export type AiInferenceAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly userId: string | null };

export interface AiInferenceWriteInput {
  readonly provider?: string;
  readonly model: string;
  readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly projectId?: string | null;
}

export interface AiInferenceRouteServices {
  readonly authorize: (permissionCode: string) => Promise<AiInferenceAuthorization>;
  readonly complete: (tenantId: string, request: AiInferenceWriteInput) => Promise<unknown>;
  readonly getAvailableProviders: () => ReadonlyArray<{ name: string; available: boolean }>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status, headers: RESPONSE_HEADERS });
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(auth: AiInferenceAuthorization): { readonly ok: true; readonly tenantId: string; readonly userId: string | null } | { readonly ok: false; readonly response: Response } {
  if (auth.outcome === "unauthenticated") return { ok: false, response: response(401) };
  if (auth.outcome === "forbidden") return { ok: false, response: response(403) };
  return { ok: true, tenantId: auth.tenantId, userId: auth.userId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseInferenceInput(input: unknown): AiInferenceWriteInput | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["provider", "model", "messages", "maxTokens", "temperature", "projectId"]);
  if (Object.keys(record).some((k) => !allowedKeys.has(k))) return null;
  if (!isNonEmptyString(record.model)) return null;
  if (!Array.isArray(record.messages) || record.messages.length === 0) return null;
  for (const msg of record.messages) {
    if (typeof msg !== "object" || msg === null) return null;
    const m = msg as Record<string, unknown>;
    if (!isNonEmptyString(m.role) || !["system", "user", "assistant"].includes(m.role)) return null;
    if (!isNonEmptyString(m.content)) return null;
  }
  if (record.provider !== undefined && !isNonEmptyString(record.provider)) return null;
  if (record.maxTokens !== undefined && (typeof record.maxTokens !== "number" || !Number.isInteger(record.maxTokens) || record.maxTokens < 1)) return null;
  if (record.temperature !== undefined && (typeof record.temperature !== "number" || record.temperature < 0 || record.temperature > 2)) return null;
  if (record.projectId !== undefined && record.projectId !== null && !isNonEmptyString(record.projectId)) return null;
  return {
    model: record.model,
    messages: record.messages as ReadonlyArray<{ readonly role: string; readonly content: string }>,
    ...(record.provider !== undefined && { provider: record.provider }),
    ...(record.maxTokens !== undefined && { maxTokens: record.maxTokens }),
    ...(record.temperature !== undefined && { temperature: record.temperature }),
    ...(record.projectId !== undefined && { projectId: record.projectId }),
  };
}

export async function handleComplete(request: Request, services: AiInferenceRouteServices): Promise<Response> {
  const auth = await services.authorize("ai.project.write");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;

  let body: unknown;
  try { body = await request.json(); } catch { return response(400); }
  const input = parseInferenceInput(body);
  if (input === null) return response(400);

  try {
    const result = await services.complete(r.tenantId, input);
    return response(200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI inference failed";
    if (message.includes("not available") || message.includes("not configured")) {
      return response(503, { error: message });
    }
    return response(502, { error: message });
  }
}

export async function handleListProviders(_request: Request, services: AiInferenceRouteServices): Promise<Response> {
  const auth = await services.authorize("ai.project.read");
  const r = authorizationOutcome(auth);
  if (!r.ok) return r.response;
  const providers = services.getAvailableProviders();
  return response(200, { providers });
}
