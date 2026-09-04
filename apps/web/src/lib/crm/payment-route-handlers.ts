import "server-only";

export type PaymentAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string };

export interface PaymentCreateInput {
  readonly invoiceId: string;
  readonly amountCents: number;
  readonly method?: string;
  readonly paidAt?: string;
  readonly notes?: string | null;
}

export interface PaymentRouteServices {
  readonly authorize: (permissionCode: string) => Promise<PaymentAuthorization>;
  readonly createPayment: (tenantId: string, input: PaymentCreateInput) => Promise<unknown>;
  readonly listPaymentsForInvoice: (tenantId: string, invoiceId: string) => Promise<readonly unknown[]>;
  readonly getPaymentTotal: (tenantId: string, invoiceId: string) => Promise<number>;
  readonly getInvoice: (tenantId: string, invoiceId: string) => Promise<{ totalCents: number } | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: PaymentAuthorization,
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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

const INVALID_JSON = Symbol("invalid-json");

async function readJsonBody(request: Request): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

export async function handleCreatePayment(
  request: Request,
  services: PaymentRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("invoice.write");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) {
    return response(400, { error: "Invalid JSON body" });
  }
  if (typeof body !== "object" || body === null) {
    return response(400, { error: "Request body must be an object" });
  }
  const record = body as Record<string, unknown>;
  const allowedKeys = new Set(["invoiceId", "amountCents", "method", "paidAt", "notes"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return response(400, { error: "Only invoiceId, amountCents, method, paidAt, and notes are allowed" });
  }
  if (!isNonEmptyString(record.invoiceId)) {
    return response(400, { error: "invoiceId is required" });
  }
  if (!isPositiveInteger(record.amountCents)) {
    return response(400, { error: "amountCents is required and must be a positive integer" });
  }
  if (record.method !== undefined && !isNonEmptyString(record.method)) {
    return response(400, { error: "method must be a non-empty string" });
  }
  if (record.paidAt !== undefined && typeof record.paidAt !== "string") {
    return response(400, { error: "paidAt must be a string" });
  }
  if (record.notes !== undefined && record.notes !== null && typeof record.notes !== "string") {
    return response(400, { error: "notes must be a string or null" });
  }
  const input: PaymentCreateInput = {
    invoiceId: record.invoiceId as string,
    amountCents: record.amountCents as number,
    method: record.method as string | undefined,
    paidAt: record.paidAt as string | undefined,
    notes: record.notes as string | null | undefined,
  };
  try {
    const payment = await services.createPayment(authResult.tenantId, input);
    return response(201, { payment });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("invoice must belong")) {
      return response(404, { error: "Invoice not found" });
    }
    if (error instanceof Error && error.message.includes("amount must be positive")) {
      return response(400, { error: "Amount must be positive" });
    }
    throw error;
  }
}

export async function handleListPaymentsForInvoice(
  _request: Request,
  services: PaymentRouteServices,
  invoiceId: string,
): Promise<Response> {
  const authorization = await services.authorize("invoice.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const payments = await services.listPaymentsForInvoice(authResult.tenantId, invoiceId);
  const total = await services.getPaymentTotal(authResult.tenantId, invoiceId);
  const invoice = await services.getInvoice(authResult.tenantId, invoiceId);
  return response(200, {
    payments,
    totalPaidCents: total,
    invoiceTotalCents: invoice?.totalCents ?? null,
  });
}
