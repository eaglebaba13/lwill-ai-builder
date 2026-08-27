import "server-only";

export type AppointmentAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface AppointmentWriteInput {
  readonly customerId: string;
  readonly serviceId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: string;
  readonly notes?: string | null;
}

export interface AppointmentUpdateInput {
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly status?: string;
  readonly notes?: string | null;
}

export interface AppointmentRouteServices {
  readonly authorize: (permissionCode: string) => Promise<AppointmentAuthorization>;
  readonly listAppointments: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getAppointment: (tenantId: string, appointmentId: string) => Promise<unknown | null>;
  readonly createAppointment: (tenantId: string, input: AppointmentWriteInput) => Promise<unknown>;
  readonly updateAppointment: (
    tenantId: string,
    appointmentId: string,
    input: AppointmentUpdateInput,
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
  authorization: AppointmentAuthorization,
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

function parseCreateInput(input: unknown): AppointmentWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    "customerId",
    "serviceId",
    "startsAt",
    "endsAt",
    "status",
    "notes",
  ]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.customerId)) {
    return null;
  }
  if (!isNonEmptyString(record.serviceId)) {
    return null;
  }
  const startsAt = parseDate(record.startsAt);
  if (startsAt === null) {
    return null;
  }
  const endsAt = parseDate(record.endsAt);
  if (endsAt === null) {
    return null;
  }
  if (endsAt <= startsAt) {
    return null;
  }
  if (typeof record.status !== "string" || record.status.trim() === "") {
    return null;
  }
  if (!isOptionalString(record.notes)) {
    return null;
  }
  return {
    customerId: record.customerId,
    serviceId: record.serviceId,
    startsAt,
    endsAt,
    status: record.status,
    notes: (record.notes as string | null | undefined) ?? null,
  };
}

function parseUpdateInput(input: unknown): AppointmentUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["startsAt", "endsAt", "status", "notes"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (Object.keys(record).length === 0) {
    return null;
  }
  const update: {
    startsAt?: Date;
    endsAt?: Date;
    status?: string;
    notes?: string | null;
  } = {};
  if (record.startsAt !== undefined) {
    const startsAt = parseDate(record.startsAt);
    if (startsAt === null) {
      return null;
    }
    update.startsAt = startsAt;
  }
  if (record.endsAt !== undefined) {
    const endsAt = parseDate(record.endsAt);
    if (endsAt === null) {
      return null;
    }
    update.endsAt = endsAt;
  }
  if (
    update.startsAt !== undefined && update.endsAt !== undefined
    && update.endsAt <= update.startsAt
  ) {
    return null;
  }
  if (record.status !== undefined) {
    if (typeof record.status !== "string" || record.status.trim() === "") {
      return null;
    }
    update.status = record.status;
  }
  if (!isOptionalString(record.notes)) {
    return null;
  }
  if (record.notes !== undefined) {
    update.notes = (record.notes as string | null | undefined) ?? null;
  }
  return update;
}

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

const INVALID_JSON = Symbol("invalid-json");

export async function handleListAppointments(
  _request: Request,
  services: AppointmentRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("appointment.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const appointmentList = await services.listAppointments(authResult.tenantId);
  return response(200, { appointments: appointmentList });
}

export async function handleCreateAppointment(
  request: Request,
  services: AppointmentRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("appointment.write");
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
  const appointment = await services.createAppointment(authResult.tenantId, input);
  return response(201, { appointment });
}

export async function handleGetAppointment(
  _request: Request,
  services: AppointmentRouteServices,
  appointmentId: string,
): Promise<Response> {
  const authorization = await services.authorize("appointment.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const appointment = await services.getAppointment(authResult.tenantId, appointmentId);
  if (appointment === null) {
    return response(404);
  }
  return response(200, { appointment });
}

export async function handleUpdateAppointment(
  request: Request,
  services: AppointmentRouteServices,
  appointmentId: string,
): Promise<Response> {
  const authorization = await services.authorize("appointment.write");
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
  const appointment = await services.updateAppointment(authResult.tenantId, appointmentId, input);
  if (appointment === null) {
    return response(404);
  }
  return response(200, { appointment });
}
