import { handleCreateAppointment, handleListAppointments } from "@/lib/crm/appointment-route-handlers";
import { createAppointmentRouteServices } from "@/lib/crm/appointment-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListAppointments(request, createAppointmentRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateAppointment(request, createAppointmentRouteServices());
}
