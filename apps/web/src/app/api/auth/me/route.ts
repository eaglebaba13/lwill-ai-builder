import { handleGetAuthMe } from "@/lib/auth/auth-me-route-handlers";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return handleGetAuthMe();
}
