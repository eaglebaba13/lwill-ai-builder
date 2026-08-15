import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { hasValidAuthenticationOrigin } from "../lib/auth/auth-origin";
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
