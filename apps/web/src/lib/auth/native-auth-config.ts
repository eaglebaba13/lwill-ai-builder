import "server-only";
import crypto from "node:crypto";
import type { NativeJwtOptions } from "./native-jwt";

const KID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export interface NativeAuthEnvironment {
  readonly LWILL_AUTH_ALLOWED_ORIGIN?: string;
  readonly LWILL_AUTH_JWT_ISSUER?: string;
  readonly LWILL_AUTH_JWT_AUDIENCE?: string;
  readonly LWILL_AUTH_JWT_ACTIVE_KID?: string;
  readonly LWILL_AUTH_JWT_PRIVATE_KEY_PEM_B64?: string;
  readonly LWILL_AUTH_JWT_VERIFICATION_KEYS_JSON?: string;
}

export interface NativeAuthRuntimeConfig {
  readonly allowedOrigin: string;
  readonly jwt: NativeJwtOptions;
}

function requireValue(value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error("Invalid native authentication configuration");
  }
  return value.trim();
}

function decodeBase64(value: string): string {
  const decoded = Buffer.from(value, "base64").toString("utf8");
  if (decoded.trim() === "") {
    throw new Error("Invalid native authentication configuration");
  }
  return decoded;
}

export function loadNativeAuthRuntimeConfig(
  environment: NativeAuthEnvironment = process.env as unknown as NativeAuthEnvironment,
): NativeAuthRuntimeConfig {
  const allowedOrigin = requireValue(environment.LWILL_AUTH_ALLOWED_ORIGIN);
  const issuer = requireValue(environment.LWILL_AUTH_JWT_ISSUER);
  const audience = requireValue(environment.LWILL_AUTH_JWT_AUDIENCE);
  const activeKid = requireValue(environment.LWILL_AUTH_JWT_ACTIVE_KID);
  if (!KID_PATTERN.test(activeKid)) {
    throw new Error("Invalid native authentication configuration");
  }

  const privateKey = crypto.createPrivateKey({
    key: decodeBase64(requireValue(environment.LWILL_AUTH_JWT_PRIVATE_KEY_PEM_B64)),
    format: "pem",
    type: "pkcs8",
  });
  const serializedVerificationKeys = JSON.parse(
    requireValue(environment.LWILL_AUTH_JWT_VERIFICATION_KEYS_JSON),
  ) as unknown;
  if (
    typeof serializedVerificationKeys !== "object" ||
    serializedVerificationKeys === null ||
    Array.isArray(serializedVerificationKeys)
  ) {
    throw new Error("Invalid native authentication configuration");
  }

  const verificationKeys: Record<string, crypto.KeyObject> = {};
  for (const [kid, encodedKey] of Object.entries(serializedVerificationKeys)) {
    if (!KID_PATTERN.test(kid) || typeof encodedKey !== "string") {
      throw new Error("Invalid native authentication configuration");
    }
    verificationKeys[kid] = crypto.createPublicKey({
      key: decodeBase64(encodedKey),
      format: "pem",
      type: "spki",
    });
  }
  if (verificationKeys[activeKid] === undefined) {
    throw new Error("Invalid native authentication configuration");
  }

  return {
    allowedOrigin: new URL(allowedOrigin).origin,
    jwt: {
      issuer,
      audience,
      keys: {
        active: { kid: activeKid, privateKey },
        verificationKeys,
      },
    },
  };
}
