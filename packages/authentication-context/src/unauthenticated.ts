import type { UnauthenticatedSession } from "./types";

/** Canonical unauthenticated state. Use instead of constructing inline. */
export const UNAUTHENTICATED: UnauthenticatedSession = { authenticated: false };
