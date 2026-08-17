import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  hasValidAuthenticationOrigin,
  hasValidMultiTenantAuthenticationOrigin,
} from "../lib/auth/auth-origin";
import { loadNativeAuthRuntimeConfig } from "../lib/auth/native-auth-config";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function environment() {
  return {
    LWILL_AUTH_ALLOWED_ORIGIN: "https://builder.lwill.in",
    LWILL_AUTH_JWT_ISSUER: "https://auth.lwill.in",
    LWILL_AUTH_JWT_AUDIENCE: "lwill-web",
    LWILL_AUTH_JWT_ACTIVE_KID: "key-1",
    LWILL_AUTH_JWT_PRIVATE_KEY_PEM_B64: encode(
      privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
    ),
    LWILL_AUTH_JWT_VERIFICATION_KEYS_JSON: JSON.stringify({
      "key-1": encode(publicKey.export({ format: "pem", type: "spki" }).toString()),
    }),
  };
}

describe("native authentication configuration", () => {
  it("loads the approved key set and origin", () => {
    const config = loadNativeAuthRuntimeConfig(environment());
    expect(config.allowedOrigin).toBe("https://builder.lwill.in");
    expect(config.jwt.keys.active.kid).toBe("key-1");
    expect(config.jwt.keys.verificationKeys["key-1"]).toBeDefined();
  });

  it("fails closed for missing or inconsistent key configuration", () => {
    expect(() => loadNativeAuthRuntimeConfig({})).toThrow();
    expect(() =>
      loadNativeAuthRuntimeConfig({
        ...environment(),
        LWILL_AUTH_JWT_ACTIVE_KID: "missing",
      }),
    ).toThrow();
  });
});

describe("authentication origin guard", () => {
  it("accepts only the configured same origin", () => {
    const headers = new Headers({
      origin: "https://builder.lwill.in",
      "sec-fetch-site": "same-origin",
    });
    expect(hasValidAuthenticationOrigin({ headers }, "https://builder.lwill.in")).toBe(true);
  });

  it.each([
    [new Headers(), "missing origin"],
    [new Headers({ origin: "null" }), "null origin"],
    [new Headers({ origin: "https://evil.example" }), "cross-site origin"],
    [
      new Headers({ origin: "https://builder.lwill.in", "sec-fetch-site": "cross-site" }),
      "cross-site fetch metadata",
    ],
  ])("rejects %s", (headers) => {
    expect(hasValidAuthenticationOrigin({ headers }, "https://builder.lwill.in")).toBe(false);
  });
});

describe("multi-tenant authentication origin guard", () => {
  const allowedOrigin = "https://builder.lwill.in";

  function resolverFor(registeredDomain: string, tenantId: string) {
    return vi.fn(async (hostname: string) => (hostname === registeredDomain ? tenantId : null));
  }

  it("allows the configured origin without consulting the tenant-domain resolver", async () => {
    const resolveOriginTenantId = resolverFor("unused.example", "tenant-unused");
    const headers = new Headers({ origin: allowedOrigin, "sec-fetch-site": "same-origin" });

    await expect(
      hasValidMultiTenantAuthenticationOrigin({ headers }, allowedOrigin, resolveOriginTenantId),
    ).resolves.toBe(true);
    expect(resolveOriginTenantId).not.toHaveBeenCalled();
  });

  it("allows a verified, active additional tenant domain via the reusable resolver", async () => {
    const resolveOriginTenantId = resolverFor(
      "xnail.makemeartist.com",
      "ae70e866-aa44-4cef-86f8-90fe253eb5ce",
    );
    const headers = new Headers({
      origin: "https://xnail.makemeartist.com",
      "sec-fetch-site": "same-origin",
    });

    await expect(
      hasValidMultiTenantAuthenticationOrigin({ headers }, allowedOrigin, resolveOriginTenantId),
    ).resolves.toBe(true);
    expect(resolveOriginTenantId).toHaveBeenCalledWith("xnail.makemeartist.com");
  });

  it("rejects an unknown/unverified/inactive domain (resolver returns null)", async () => {
    const resolveOriginTenantId = resolverFor("xnail.makemeartist.com", "tenant-1");
    const headers = new Headers({
      origin: "https://unknown.example",
      "sec-fetch-site": "same-origin",
    });

    await expect(
      hasValidMultiTenantAuthenticationOrigin({ headers }, allowedOrigin, resolveOriginTenantId),
    ).resolves.toBe(false);
  });

  it("rejects a missing Origin header", async () => {
    const resolveOriginTenantId = resolverFor("xnail.makemeartist.com", "tenant-1");
    await expect(
      hasValidMultiTenantAuthenticationOrigin(
        { headers: new Headers() },
        allowedOrigin,
        resolveOriginTenantId,
      ),
    ).resolves.toBe(false);
    expect(resolveOriginTenantId).not.toHaveBeenCalled();
  });

  it("rejects a malformed Origin header", async () => {
    const resolveOriginTenantId = resolverFor("xnail.makemeartist.com", "tenant-1");
    const headers = new Headers({ origin: "not-a-valid-url", "sec-fetch-site": "same-origin" });

    await expect(
      hasValidMultiTenantAuthenticationOrigin({ headers }, allowedOrigin, resolveOriginTenantId),
    ).resolves.toBe(false);
    expect(resolveOriginTenantId).not.toHaveBeenCalled();
  });

  it("rejects a non-HTTPS Origin", async () => {
    const resolveOriginTenantId = resolverFor("xnail.makemeartist.com", "tenant-1");
    const headers = new Headers({
      origin: "http://xnail.makemeartist.com",
      "sec-fetch-site": "same-origin",
    });

    await expect(
      hasValidMultiTenantAuthenticationOrigin({ headers }, allowedOrigin, resolveOriginTenantId),
    ).resolves.toBe(false);
    expect(resolveOriginTenantId).not.toHaveBeenCalled();
  });

  it("rejects cross-site Sec-Fetch-Site even for an otherwise verified domain", async () => {
    const resolveOriginTenantId = resolverFor("xnail.makemeartist.com", "tenant-1");
    const headers = new Headers({
      origin: "https://xnail.makemeartist.com",
      "sec-fetch-site": "cross-site",
    });

    await expect(
      hasValidMultiTenantAuthenticationOrigin({ headers }, allowedOrigin, resolveOriginTenantId),
    ).resolves.toBe(false);
    expect(resolveOriginTenantId).not.toHaveBeenCalled();
  });

  it("does not accept a substring/lookalike origin (exact-origin behavior preserved)", async () => {
    const resolveOriginTenantId = resolverFor("builder.lwill.in", "tenant-1");
    const headers = new Headers({
      origin: "https://builder.lwill.in.evil.example",
      "sec-fetch-site": "same-origin",
    });

    await expect(
      hasValidMultiTenantAuthenticationOrigin({ headers }, allowedOrigin, resolveOriginTenantId),
    ).resolves.toBe(false);
    expect(resolveOriginTenantId).toHaveBeenCalledWith("builder.lwill.in.evil.example");
  });

  it("preserves tenant isolation: an origin registered to a different tenant boundary is still evaluated only by hostname match", async () => {
    const resolveOriginTenantId = vi.fn(async (hostname: string) =>
      hostname === "xnail.makemeartist.com" ? "ae70e866-aa44-4cef-86f8-90fe253eb5ce" : null);
    const otherTenantOrigin = new Headers({
      origin: "https://other-tenant.example",
      "sec-fetch-site": "same-origin",
    });

    await expect(
      hasValidMultiTenantAuthenticationOrigin(
        { headers: otherTenantOrigin },
        allowedOrigin,
        resolveOriginTenantId,
      ),
    ).resolves.toBe(false);
  });
});
