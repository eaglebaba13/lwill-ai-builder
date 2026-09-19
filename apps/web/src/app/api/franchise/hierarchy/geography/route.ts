import { handleListGeography } from "@/lib/crm/franchise-geography-handlers";
export const runtime = "nodejs";

export const GET = (request: Request) => handleListGeography(request);
