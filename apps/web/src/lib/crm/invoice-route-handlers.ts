import "server-only";

export type InvoiceAuthorization =
  | { readonly outcome: "unauthenticated" }
  | { readonly outcome: "forbidden" }
  | { readonly outcome: "authorized"; readonly tenantId: string; readonly branchId: string | null };

export interface InvoiceLineItemWriteInput {
  readonly description: string;
  readonly serviceId?: string | null;
  readonly packageId?: string | null;
  readonly productId?: string | null;
  readonly quantity: number;
  readonly unitPriceCents: number;
}

export interface InvoiceWriteInput {
  readonly customerId: string;
  readonly issuedAt: Date;
  readonly items: readonly InvoiceLineItemWriteInput[];
  readonly discountCents?: number;
  readonly gstCents?: number;
  readonly notes?: string | null;
  readonly branchId?: string | null;
}

export interface InvoiceUpdateInput {
  readonly discountCents?: number;
  readonly notes?: string | null;
}

export interface InvoiceRouteServices {
  readonly authorize: (permissionCode: string) => Promise<InvoiceAuthorization>;
  readonly listInvoices: (tenantId: string) => Promise<readonly unknown[]>;
  readonly getInvoice: (tenantId: string, invoiceId: string) => Promise<unknown | null>;
  readonly createInvoice: (tenantId: string, branchId: string | null, input: InvoiceWriteInput) => Promise<unknown>;
  readonly updateInvoice: (tenantId: string, invoiceId: string, input: InvoiceUpdateInput) => Promise<unknown | null>;
}

const RESPONSE_HEADERS = { "cache-control": "no-store" };

function response(status: number, body?: unknown): Response {
  if (body === undefined) {
    return new Response(null, { status, headers: RESPONSE_HEADERS });
  }
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function authorizationOutcome(
  authorization: InvoiceAuthorization,
): { readonly ok: true; readonly tenantId: string; readonly branchId: string | null } | { readonly ok: false; readonly response: Response } {
  if (authorization.outcome === "unauthenticated") {
    return { ok: false, response: response(401) };
  }
  if (authorization.outcome === "forbidden") {
    return { ok: false, response: response(403) };
  }
  return { ok: true, tenantId: authorization.tenantId, branchId: authorization.branchId ?? null };
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseLineItem(input: unknown): InvoiceLineItemWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["description", "serviceId", "packageId", "productId", "quantity", "unitPriceCents"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.description)) {
    return null;
  }
  if (!isOptionalString(record.serviceId)) {
    return null;
  }
  if (!isOptionalString(record.packageId)) {
    return null;
  }
  if (!isOptionalString(record.productId)) {
    return null;
  }
  if (!isNonNegativeInteger(record.quantity)) {
    return null;
  }
  if (!isNonNegativeInteger(record.unitPriceCents)) {
    return null;
  }
  return {
    description: record.description,
    serviceId: record.serviceId ?? null,
    packageId: record.packageId ?? null,
    productId: record.productId ?? null,
    quantity: record.quantity,
    unitPriceCents: record.unitPriceCents,
  };
}

function parseCreateInput(input: unknown): InvoiceWriteInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["customerId", "issuedAt", "items", "discountCents", "gstCents", "notes", "branchId"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (!isNonEmptyString(record.customerId)) {
    return null;
  }
  const issuedAt = parseDate(record.issuedAt);
  if (issuedAt === null) {
    return null;
  }
  if (!Array.isArray(record.items) || record.items.length === 0) {
    return null;
  }
  const items = record.items.map(parseLineItem);
  if (items.some((item) => item === null)) {
    return null;
  }
  if (record.discountCents !== undefined && !isNonNegativeInteger(record.discountCents)) {
    return null;
  }
  if (record.gstCents !== undefined && !isNonNegativeInteger(record.gstCents)) {
    return null;
  }
  if (!isOptionalString(record.notes)) {
    return null;
  }
  return {
    customerId: record.customerId,
    issuedAt,
    items: items as readonly InvoiceLineItemWriteInput[],
    ...(record.discountCents !== undefined && { discountCents: record.discountCents }),
    ...(record.gstCents !== undefined && { gstCents: record.gstCents }),
    notes: record.notes ?? null,
    branchId: record.branchId !== undefined ? (record.branchId as string | null) : null,
  };
}

function parseUpdateInput(input: unknown): InvoiceUpdateInput | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["discountCents", "notes"]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  if (record.discountCents !== undefined && !isNonNegativeInteger(record.discountCents)) {
    return null;
  }
  if (!isOptionalString(record.notes)) {
    return null;
  }
  return {
    discountCents: record.discountCents as number | undefined,
    notes: record.notes as string | null | undefined,
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

export async function handleListInvoices(
  _request: Request,
  services: InvoiceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("invoice.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const invoiceList = await services.listInvoices(authResult.tenantId);
  return response(200, { invoices: invoiceList });
}

export async function handleCreateInvoice(
  request: Request,
  services: InvoiceRouteServices,
): Promise<Response> {
  const authorization = await services.authorize("invoice.write");
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
  const branchId = authResult.branchId ?? input.branchId ?? null;
  const invoice = await services.createInvoice(authResult.tenantId, branchId, input);
  return response(201, { invoice });
}

export async function handleGetInvoice(
  _request: Request,
  services: InvoiceRouteServices,
  invoiceId: string,
): Promise<Response> {
  const authorization = await services.authorize("invoice.read");
  const authResult = authorizationOutcome(authorization);
  if (!authResult.ok) {
    return authResult.response;
  }
  const invoice = await services.getInvoice(authResult.tenantId, invoiceId);
  if (invoice === null) {
    return response(404);
  }
  return response(200, { invoice });
}

export async function handleUpdateInvoice(
  request: Request,
  services: InvoiceRouteServices,
  invoiceId: string,
): Promise<Response> {
  const authorization = await services.authorize("invoice.write");
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
  const invoice = await services.updateInvoice(authResult.tenantId, invoiceId, input);
  if (invoice === null) {
    return response(404);
  }
  return response(200, { invoice });
}
