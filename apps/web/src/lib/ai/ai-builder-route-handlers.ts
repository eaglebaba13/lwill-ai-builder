import "server-only";

export type AiBuilderAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface AiProjectWriteInput {
  readonly name: string;
  readonly description?: string | null;
  readonly status?: string;
  readonly metadata?: Record<string, unknown> | null;
}

export interface AiSessionWriteInput {
  readonly projectId: string;
  readonly userId?: string | null;
  readonly title: string;
}

export interface AiPromptWriteInput {
  readonly projectId: string;
  readonly sessionId: string;
  readonly role: string;
  readonly content: string;
  readonly tokenCount?: number | null;
}

export interface AiModelUsageWriteInput {
  readonly projectId?: string | null;
  readonly provider: string;
  readonly modelName: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
}

export interface AiBuilderRouteServices {
  readonly authorize: (permissionCode: string) => Promise<AiBuilderAuthorization>;
  readonly createProject: (tenantId: string, input: AiProjectWriteInput) => Promise<unknown>;
  readonly getProject: (tenantId: string, projectId: string) => Promise<unknown | null>;
  readonly listProjects: (tenantId: string) => Promise<readonly unknown[]>;
  readonly updateProject: (
    tenantId: string,
    projectId: string,
    input: Partial<AiProjectWriteInput>,
  ) => Promise<unknown | null>;
  readonly createSession: (tenantId: string, input: AiSessionWriteInput) => Promise<unknown>;
  readonly getSession: (tenantId: string, sessionId: string) => Promise<unknown | null>;
  readonly listSessions: (tenantId: string, projectId?: string) => Promise<readonly unknown[]>;
  readonly recordPrompt: (tenantId: string, input: AiPromptWriteInput) => Promise<unknown>;
  readonly listPromptsForSession: (
    tenantId: string,
    sessionId: string,
  ) => Promise<readonly unknown[]>;
  readonly recordUsage: (tenantId: string, input: AiModelUsageWriteInput) => Promise<unknown>;
  readonly getProjectUsageSummary: (
    tenantId: string,
    projectId: string,
  ) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: AiBuilderAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalObject(value: unknown): value is Record<string, unknown> | null | undefined {
  return value === undefined || value === null || (typeof value === "object" && !Array.isArray(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseProjectInput(input: unknown, requireName: boolean): AiProjectWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["name", "description", "status", "metadata"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (requireName && !isNonEmptyString(record.name)) {
    return null;
  }
  if (record.name !== undefined && !isNonEmptyString(record.name)) {
    return null;
  }
  if (!isOptionalString(record.description)) {
    return null;
  }
  if (record.status !== undefined && typeof record.status !== "string") {
    return null;
  }
  if (!isOptionalObject(record.metadata)) {
    return null;
  }
  return {
    name: record.name as string,
    description: (record.description as string | null | undefined) ?? null,
    status: (record.status as string | undefined) ?? undefined,
    metadata: (record.metadata as Record<string, unknown> | null | undefined) ?? undefined,
  };
}

function parseSessionInput(input: unknown): AiSessionWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["projectId", "userId", "title"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (typeof record.projectId !== "string" || record.projectId.trim() === "") {
    return null;
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    return null;
  }
  if (!isOptionalString(record.userId)) {
    return null;
  }
  return {
    projectId: record.projectId.trim(),
    userId: record.userId ?? undefined,
    title: record.title.trim(),
  };
}

function parsePromptInput(input: unknown): AiPromptWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["projectId", "sessionId", "role", "content", "tokenCount"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (typeof record.projectId !== "string" || record.projectId.trim() === "") {
    return null;
  }
  if (typeof record.sessionId !== "string" || record.sessionId.trim() === "") {
    return null;
  }
  if (typeof record.role !== "string" || record.role.trim() === "") {
    return null;
  }
  if (typeof record.content !== "string" || record.content.trim() === "") {
    return null;
  }
  if (record.tokenCount !== undefined && record.tokenCount !== null && (typeof record.tokenCount !== "number" || !Number.isInteger(record.tokenCount) || record.tokenCount < 0)) {
    return null;
  }
  return {
    projectId: record.projectId.trim(),
    sessionId: record.sessionId.trim(),
    role: record.role.trim(),
    content: record.content.trim(),
    tokenCount: record.tokenCount ?? undefined,
  };
}

function parseModelUsageInput(input: unknown): AiModelUsageWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["projectId", "provider", "modelName", "promptTokens", "completionTokens", "totalTokens", "durationMs"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.provider)) {
    return null;
  }
  if (!isNonEmptyString(record.modelName)) {
    return null;
  }
  for (const field of ["promptTokens", "completionTokens", "totalTokens", "durationMs"] as const) {
    const val = record[field];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
      return null;
    }
  }
  return {
    projectId: record.projectId as string | undefined,
    provider: record.provider as string,
    modelName: record.modelName as string,
    promptTokens: record.promptTokens as number,
    completionTokens: record.completionTokens as number,
    totalTokens: record.totalTokens as number,
    durationMs: record.durationMs as number,
  };
}

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

const INVALID_JSON = Symbol("invalid-json");

// Project handlers
export async function handleListProjects(
  _request: Request,
  services: AiBuilderRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const projects = await services.listProjects(authResult.tenantId);
  return response(200, { projects });
}

export async function handleCreateProject(
  request: Request,
  services: AiBuilderRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseProjectInput(body, true);
  if (input === null) {
    return response(400);
  }
  const project = await services.createProject(authResult.tenantId, input);
  return response(201, { project });
}

export async function handleGetProject(
  _request: Request,
  services: AiBuilderRouteServices,
  projectId: string,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const project = await services.getProject(authResult.tenantId, projectId);
  if (project === null) {
    return response(404);
  }
  return response(200, { project });
}

export async function handleUpdateProject(
  request: Request,
  services: AiBuilderRouteServices,
  projectId: string,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
    return response(400);
  }
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["name", "description", "status", "metadata"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400);
  }
  const input = parseProjectInput(body, false);
  if (input === null) {
    return response(400);
  }
  const update: {
    name?: string;
    description?: string | null;
    status?: string;
    metadata?: Record<string, unknown> | null;
  } = {};
  if (record.name !== undefined) update.name = input.name;
  if (record.description !== undefined) update.description = input.description;
  if (record.status !== undefined) update.status = input.status;
  if (record.metadata !== undefined) update.metadata = input.metadata;

  const project = await services.updateProject(authResult.tenantId, projectId, update);
  if (project === null) {
    return response(404);
  }
  return response(200, { project });
}

// Session handlers
export async function handleCreateSession(
  request: Request,
  services: AiBuilderRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseSessionInput(body);
  if (input === null) {
    return response(400);
  }
  const session = await services.createSession(authResult.tenantId, input);
  return response(201, { session });
}

export async function handleListSessions(
  request: Request,
  services: AiBuilderRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const sessions = await services.listSessions(authResult.tenantId, projectId);
  return response(200, { sessions });
}

export async function handleGetSession(
  _request: Request,
  services: AiBuilderRouteServices,
  sessionId: string,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const session = await services.getSession(authResult.tenantId, sessionId);
  if (session === null) {
    return response(404);
  }
  return response(200, { session });
}

// Prompt handlers
export async function handleRecordPrompt(
  request: Request,
  services: AiBuilderRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parsePromptInput(body);
  if (input === null) {
    return response(400);
  }
  const prompt = await services.recordPrompt(authResult.tenantId, input);
  return response(201, { prompt });
}

export async function handleListPromptsForSession(
  _request: Request,
  services: AiBuilderRouteServices,
  sessionId: string,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const prompts = await services.listPromptsForSession(authResult.tenantId, sessionId);
  return response(200, { prompts });
}

// Model usage handlers
export async function handleRecordUsage(
  request: Request,
  services: AiBuilderRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseModelUsageInput(body);
  if (input === null) {
    return response(400);
  }
  const usage = await services.recordUsage(authResult.tenantId, input);
  return response(201, { usage });
}

export async function handleGetProjectUsageSummary(
  _request: Request,
  services: AiBuilderRouteServices,
  projectId: string,
): Promise<Response> {
  const authorization = await services.authorize("ai.project.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const summary = await services.getProjectUsageSummary(authResult.tenantId, projectId);
  if (summary === null) {
    return response(404);
  }
  return response(200, { summary });
}
