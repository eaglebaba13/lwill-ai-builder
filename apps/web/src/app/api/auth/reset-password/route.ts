import { handleResetPassword } from "@/lib/auth/native-auth-route-handlers";
import { createNativeAuthRouteServices } from "@/lib/auth/native-auth-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleResetPassword(request, await createNativeAuthRouteServices(request));
}
