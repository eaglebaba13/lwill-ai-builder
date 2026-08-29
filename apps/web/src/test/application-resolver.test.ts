import { describe, expect, it } from "vitest";
import { resolveApplicationContext } from "../lib/application-resolver";

describe("application-resolver", () => {
  it("maps lwill.in to corporate", () => {
    expect(resolveApplicationContext("lwill.in")).toBe("corporate");
    expect(resolveApplicationContext("www.lwill.in")).toBe("corporate");
    expect(resolveApplicationContext("Lwill.IN")).toBe("corporate");
  });

  it("maps builder.lwill.in to builder", () => {
    expect(resolveApplicationContext("builder.lwill.in")).toBe("builder");
    expect(resolveApplicationContext("www.builder.lwill.in")).toBe("builder");
    expect(resolveApplicationContext("BUILDER.LWILL.IN")).toBe("builder");
  });

  it("maps xnail.makemeartist.com to xnail", () => {
    expect(resolveApplicationContext("xnail.makemeartist.com")).toBe("xnail");
    expect(resolveApplicationContext("www.xnail.makemeartist.com")).toBe("xnail");
    expect(resolveApplicationContext("XNAIL.MAKEMEARTIST.COM")).toBe("xnail");
  });

  it("strips ports before matching", () => {
    expect(resolveApplicationContext("lwill.in:3000")).toBe("corporate");
    expect(resolveApplicationContext("builder.lwill.in:443")).toBe("builder");
    expect(resolveApplicationContext("xnail.makemeartist.com:8080")).toBe("xnail");
  });

  it("returns corporate for unknown hostnames", () => {
    expect(resolveApplicationContext("unknown.example.com")).toBe("corporate");
    expect(resolveApplicationContext("localhost")).toBe("corporate");
    expect(resolveApplicationContext("127.0.0.1")).toBe("corporate");
  });

  it("returns corporate for null or undefined hostnames", () => {
    expect(resolveApplicationContext(null)).toBe("corporate");
    expect(resolveApplicationContext(undefined)).toBe("corporate");
  });
});
