export class OperationalAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationalAccessError";
  }
}

export type OperationalTenantContext = {
  authenticated: boolean;
  tenantId?: string;
  activeTenantId?: string;
  branchId?: string;
};

export function ensureOperationalAccess(
  context: OperationalTenantContext,
): asserts context is OperationalTenantContext & { authenticated: true } {
  if (!context.authenticated) {
    throw new OperationalAccessError("Authentication required for X Nail operations.");
  }

  const activeTenantId = context.activeTenantId ?? context.tenantId;
  if (!activeTenantId) {
    throw new OperationalAccessError("Tenant context is required for X Nail operations.");
  }

  if (context.tenantId && context.tenantId !== activeTenantId) {
    throw new OperationalAccessError("Cross-tenant access is not allowed.");
  }
}

export function createCustomerRecord(input: {
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
}): {
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
} {
  if (!input.name || input.name.trim().length === 0) {
    throw new OperationalAccessError("Customer name is required.");
  }

  return {
    tenantId: input.tenantId,
    name: input.name,
    phone: input.phone,
    email: input.email,
  };
}

export function createServiceRecord(input: {
  tenantId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  isActive?: boolean;
}): {
  tenantId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
} {
  if (!input.name || input.name.trim().length === 0) {
    throw new OperationalAccessError("Service name is required.");
  }

  return {
    tenantId: input.tenantId,
    name: input.name,
    durationMinutes: input.durationMinutes,
    priceCents: input.priceCents,
    isActive: input.isActive ?? true,
  };
}

export function createStaffRecord(input: {
  tenantId: string;
  displayName: string;
  branchId: string;
  isActive?: boolean;
}): {
  tenantId: string;
  displayName: string;
  branchId: string;
  isActive: boolean;
} {
  if (!input.displayName || input.displayName.trim().length === 0) {
    throw new OperationalAccessError("Staff name is required.");
  }

  return {
    tenantId: input.tenantId,
    displayName: input.displayName,
    branchId: input.branchId,
    isActive: input.isActive ?? true,
  };
}

export const APPOINTMENT_STATUS_ORDER = [
  "Booked",
  "Confirmed",
  "Arrived",
  "In Service",
  "Completed",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS_ORDER)[number];

export function createAppointmentRecord(input: {
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
}): {
  tenantId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
} {
  if (!APPOINTMENT_STATUS_ORDER.includes(input.status as AppointmentStatus)) {
    throw new OperationalAccessError("Unsupported appointment status.");
  }

  return {
    tenantId: input.tenantId,
    customerId: input.customerId,
    serviceId: input.serviceId,
    staffId: input.staffId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: input.status,
  };
}

export function transitionAppointmentStatus<T extends { status: AppointmentStatus }>(
  appointment: T,
  nextStatus: AppointmentStatus,
): T & { status: AppointmentStatus } {
  const currentIndex = APPOINTMENT_STATUS_ORDER.indexOf(appointment.status);
  const nextIndex = APPOINTMENT_STATUS_ORDER.indexOf(nextStatus);

  if (currentIndex === -1 || nextIndex === -1) {
    throw new OperationalAccessError("Unsupported appointment status.");
  }

  if (nextIndex < currentIndex) {
    throw new OperationalAccessError("Appointment status can only move forward.");
  }

  return {
    ...appointment,
    status: nextStatus,
  };
}

export function createInvoiceRecord(input: {
  tenantId: string;
  customerId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  discountCents?: number;
  gstCents?: number;
}): {
  tenantId: string;
  customerId: string;
  subtotalCents: number;
  discountCents: number;
  gstCents: number;
  totalCents: number;
} {
  if (!input.customerId) {
    throw new OperationalAccessError("Customer is required for invoice creation.");
  }

  const subtotalCents = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  const discountCents = input.discountCents ?? 0;
  const gstCents = input.gstCents ?? 0;
  const totalCents = subtotalCents - discountCents + gstCents;

  return {
    tenantId: input.tenantId,
    customerId: input.customerId,
    subtotalCents,
    discountCents,
    gstCents,
    totalCents,
  };
}
