import { handleCreateAttendance, handleListAttendance } from "@/lib/crm/attendance-route-handlers";
import { createAttendanceRouteServices } from "@/lib/crm/attendance-runtime";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleListAttendance(request, createAttendanceRouteServices());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateAttendance(request, createAttendanceRouteServices());
}
