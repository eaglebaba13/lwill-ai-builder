import { handleGetAppointment, handleUpdateAppointment } from "@/lib/crm/appointment-route-handlers";
import { createAppointmentRouteServices } from "@/lib/crm/appointment-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetAppointment(request, createAppointmentRouteServices(), id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateAppointment(request, createAppointmentRouteServices(), id);
}
