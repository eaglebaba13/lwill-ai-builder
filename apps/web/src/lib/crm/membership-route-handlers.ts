import "server-only";

export type MembershipAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface MembershipWriteInput {
  readonly customerId: string;
  readonly packageId: string;
  readonly startedAt: Date;
  readonly endsAt?: Date | null;
  readonly status?: string | null;
}

export interface MembershipUpdateInput {
  readonly packageId?: string;
  readonly startedAt?: Date;
  readonly endsAt?: Date | null;
  readonly status?: string | null;
}

export interface MembershipRouteServices {
  readonly authorize: (permissionCode: string) => Promise<MembershipAuthorization>;
  readonly listMemberships: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getMembership: (tenantId: string, membershipId: string) => Promise<unknown | null>;
  readonly createMembership: (tenantId: string, input: MembershipWriteInput) => Promise<unknown>;
  readonly updateMembership: (tenantId: string, membershipId: string, input: MembershipUpdateInput) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: MembershipAuthorization,
): { readonly ok: true; readonly tenantId: string } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function parseCreateInput(input: unknown): MembershipWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["customerId", "packageId", "startedAt", "endsAt", "status"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.customerId)) {
    return null;
  }
  if (!isNonEmptyString(record.packageId)) {
    return null;
  }
  const startedAt = parseDate(record.startedAt);
  if (startedAt === null) {
    return null;
  }
  if (record.endsAt !== undefined && !isOptionalString(record.endsAt)) {
    return null;
  }
  const endsAt = record.endsAt === undefined ? undefined : record.endsAt === null ? null : parseDate(record.endsAt);
  if (record.endsAt !== undefined && record.endsAt !== null && endsAt === null) {
    return null;
  }
  if (!isOptionalString(record.status)) {
    return null;
  }
  return {
    customerId: record.customerId,
    packageId: record.packageId,
    startedAt,
    endsAt: endsAt ?? null,
    status: (record.status as string | null | undefined) ?? null,
  };
}

function parseUpdateInput(input: unknown): MembershipUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["packageId", "startedAt", "endsAt", "status"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (record.packageId !== undefined && !isNonEmptyString(record.packageId)) {
    return null;
  }
  if (record.startedAt !== undefined) {
    const startedAt = parseDate(record.startedAt);
    if (startedAt === null) {
      return null;
    }
    record.startedAt = startedAt;
  }
  if (record.endsAt !== undefined && !isOptionalString(record.endsAt)) {
    return null;
  }
  if (record.endsAt !== undefined && record.endsAt !== null) {
    const endsAt = parseDate(record.endsAt);
    if (endsAt === null) {
      return null;
    }
    record.endsAt = endsAt;
  }
  if (record.status !== undefined && !isOptionalString(record.status)) {
    return null;
  }
  return {
    packageId: record.packageId as string | undefined,
    startedAt: record.startedAt as Date | undefined,
    endsAt: record.endsAt as Date | null | undefined,
    status: record.status as string | null | undefined,
  };
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleListMemberships(
  _request: Request,
  services: MembershipRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("membership.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const membershipList = await services.listMemberships(authResult.tenantId);
  return response(200, { memberships: membershipList });
}

export async function handleCreateMembership(
  request: Request,
  services: MembershipRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("membership.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseCreateInput(body);
  if (input === null) {
    return response(400);
  }
  const membership = await services.createMembership(authResult.tenantId, input);
  return response(201, { membership });
}

export async function handleGetMembership(
  _request: Request,
  services: MembershipRouteServices,
  membershipId: string,
): Promise<Response> {
  const authorization = await services.authorize("membership.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const membership = await services.getMembership(authResult.tenantId, membershipId);
  if (membership === null) {
    return response(404);
  }
  return response(200, { membership });
}

export async function handleUpdateMembership(
  request: Request,
  services: MembershipRouteServices,
  membershipId: string,
): Promise<Response> {
  const authorization = await services.authorize("membership.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400);
  }
  const input = parseUpdateInput(body);
  if (input === null) {
    return response(400);
  }
  const membership = await services.updateMembership(authResult.tenantId, membershipId, input);
  if (membership === null) {
    return response(404);
  }
  return response(200, { membership });
}
