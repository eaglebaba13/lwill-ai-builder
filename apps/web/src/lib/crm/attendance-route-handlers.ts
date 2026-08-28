import "server-only";

export type AttendanceAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface AttendanceWriteInput {
  readonly staffId: string;
  readonly checkInAt: Date;
  readonly checkOutAt?: Date | null;
  readonly status?: string | null;
  readonly notes?: string | null;
}

export interface AttendanceRouteServices {
  readonly authorize: (permissionCode: string) => Promise<AttendanceAuthorization>;
  readonly listAttendance: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getAttendance: (tenantId: string, attendanceId: string) => Promise<unknown | null>;
  readonly createAttendance: (tenantId: string, input: AttendanceWriteInput) => Promise<unknown>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: AttendanceAuthorization,
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

function parseCreateInput(input: unknown): AttendanceWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["staffId", "checkInAt", "checkOutAt", "status", "notes"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.staffId)) {
    return null;
  }
  const checkInAt = parseDate(record.checkInAt);
  if (checkInAt === null) {
    return null;
  }
  if (record.checkOutAt !== undefined && !isOptionalString(record.checkOutAt)) {
    return null;
  }
  const checkOutAt = record.checkOutAt === undefined ? undefined : parseDate(record.checkOutAt);
  if (record.checkOutAt !== undefined && record.checkOutAt !== null && checkOutAt === null) {
    return null;
  }
  if (!isOptionalString(record.status)) {
    return null;
  }
  if (!isOptionalString(record.notes)) {
    return null;
  }
  return {
    staffId: record.staffId,
    checkInAt,
    checkOutAt: checkOutAt ?? null,
    status: record.status ?? null,
    notes: record.notes ?? null,
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

export async function handleListAttendance(
  _request: Request,
  services: AttendanceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("attendance.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const attendanceList = await services.listAttendance(authResult.tenantId);
  return response(200, { attendance: attendanceList });
}

export async function handleCreateAttendance(
  request: Request,
  services: AttendanceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("attendance.write");
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
  const attendance = await services.createAttendance(authResult.tenantId, input);
  return response(201, { attendance });
}

export async function handleGetAttendance(
  _request: Request,
  services: AttendanceRouteServices,
  attendanceId: string,
): Promise<Response> {
  const authorization = await services.authorize("attendance.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const attendance = await services.getAttendance(authResult.tenantId, attendanceId);
  if (attendance === null) {
    return response(404);
  }
  return response(200, { attendance });
}
