import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveApplicationContext } from "./lib/application-resolver";

const APP_PREFIXES: Readonly<Record<string, string>> = {
  corporate: "corporate",
  builder: "builder",
  xnail: "xnail",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const context = resolveApplicationContext(host);
  const prefix = APP_PREFIXES[context] ?? "corporate";

  const url = request.nextUrl.clone();
  if (pathname === "/") {
    url.pathname = `/${prefix}`;
  } else if (pathname !== `/${prefix}` && !pathname.startsWith(`/${prefix}/`)) {
    url.pathname = `/${prefix}${pathname}`;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon\\.ico).*)",
  ],
};
