import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function createRequest(host: string | null, pathname: string): NextRequest {
  const url = new URL(`https://${host ?? "unknown"}${pathname}`);
  return new NextRequest(url, {
    headers: new Headers({
      host: host ?? "unknown",
    }),
  });
}

describe("middleware routing", () => {
  it("rewrites lwill.in root to corporate", async () => {
    const request = createRequest("lwill.in", "/");
    const response = await middleware(request);
    expect(response.status).toBe(200);
    const url = new URL(response.headers.get("x-middleware-rewrite") ?? response.headers.get("location") ?? "");
    expect(url.pathname).toBe("/corporate");
  });

  it("rewrites builder.lwill.in root to builder", async () => {
    const request = createRequest("builder.lwill.in", "/");
    const response = await middleware(request);
    const url = new URL(response.headers.get("x-middleware-rewrite") ?? "");
    expect(url.pathname).toBe("/builder");
  });

  it("rewrites xnail.makemeartist.com root to xnail", async () => {
    const request = createRequest("xnail.makemeartist.com", "/");
    const response = await middleware(request);
    const url = new URL(response.headers.get("x-middleware-rewrite") ?? "");
    expect(url.pathname).toBe("/xnail");
  });

  it("rewrites unknown hostname to corporate", async () => {
    const request = createRequest("unknown.example.com", "/");
    const response = await middleware(request);
    const url = new URL(response.headers.get("x-middleware-rewrite") ?? "");
    expect(url.pathname).toBe("/corporate");
  });

  it("preserves nested paths under the app prefix", async () => {
    const request = createRequest("builder.lwill.in", "/projects/123");
    const response = await middleware(request);
    const url = new URL(response.headers.get("x-middleware-rewrite") ?? "");
    expect(url.pathname).toBe("/builder/projects/123");
  });

  it("does not rewrite api routes", async () => {
    const request = createRequest("xnail.makemeartist.com", "/api/customers");
    const response = await middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not rewrite next internals", async () => {
    const request = createRequest("lwill.in", "/_next/static/chunk.js");
    const response = await middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("does not rewrite favicon", async () => {
    const request = createRequest("lwill.in", "/favicon.ico");
    const response = await middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("does not double-prefix an already-prefixed root path", async () => {
    const corporate = createRequest("lwill.in", "/corporate");
    const response = await middleware(corporate);
    const url = new URL(response.headers.get("x-middleware-rewrite") ?? "");
    expect(url.pathname).toBe("/corporate");

    const builder = createRequest("builder.lwill.in", "/builder");
    const builderResponse = await middleware(builder);
    const builderUrl = new URL(builderResponse.headers.get("x-middleware-rewrite") ?? "");
    expect(builderUrl.pathname).toBe("/builder");

    const xnail = createRequest("xnail.makemeartist.com", "/xnail");
    const xnailResponse = await middleware(xnail);
    const xnailUrl = new URL(xnailResponse.headers.get("x-middleware-rewrite") ?? "");
    expect(xnailUrl.pathname).toBe("/xnail");
  });

  it("preserves nested paths under an already-prefixed path", async () => {
    const request = createRequest("lwill.in", "/corporate/about");
    const response = await middleware(request);
    const url = new URL(response.headers.get("x-middleware-rewrite") ?? "");
    expect(url.pathname).toBe("/corporate/about");
  });
});
