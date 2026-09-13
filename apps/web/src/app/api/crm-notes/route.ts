import { handleListCrmNotes, handleCreateCrmNote } from "@/lib/crm/crm-note-route-handlers";
import { createCrmNoteRouteServices } from "@/lib/crm/crm-note-runtime";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleListCrmNotes(request, createCrmNoteRouteServices()); }
export async function POST(request: Request) { return handleCreateCrmNote(request, createCrmNoteRouteServices()); }
