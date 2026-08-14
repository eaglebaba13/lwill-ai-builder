import crypto, { type KeyObject } from "node:crypto";

export const NATIVE_ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60;

export interface NativeJwtClaims {
  readonly iss: string;
  readonly aud: string;
  readonly sub: string;
  readonly sid: string;
  readonly iat: number;
  readonly exp: number;
  readonly jti: string;
}

export interface NativeJwtKeySet {
  readonly active: {
    readonly kid: string;
    readonly privateKey: KeyObject | string;
  };
  readonly verificationKeys: Readonly<Record<string, KeyObject | string>>;
}

export interface NativeJwtOptions {
  readonly issuer: string;
  readonly audience: string;
  readonly keys: NativeJwtKeySet;
  readonly now?: () => Date;
}

export interface NativeJwtService {
  issue(input: { userId: string; sessionId: string }): string;
  verify(token: string): NativeJwtClaims | null;
}

const EXPECTED_CLAIMS = ["aud", "exp", "iat", "iss", "jti", "sid", "sub"];

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === keys.length && actualKeys.every((key, index) => key === keys[index]);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function createNativeJwtService(options: NativeJwtOptions): NativeJwtService {
  const now = options.now ?? (() => new Date());

  if (
    options.issuer.length === 0 ||
    options.audience.length === 0 ||
    options.keys.active.kid.length === 0 ||
    options.keys.verificationKeys[options.keys.active.kid] === undefined
  ) {
    throw new Error("Invalid native JWT configuration");
  }

  return {
    issue(input) {
      if (input.userId.length === 0 || input.sessionId.length === 0) {
        throw new Error("Native JWT subject and session are required");
      }

      const issuedAt = Math.floor(now().getTime() / 1000);
      const claims: NativeJwtClaims = {
        iss: options.issuer,
        aud: options.audience,
        sub: input.userId,
        sid: input.sessionId,
        iat: issuedAt,
        exp: issuedAt + NATIVE_ACCESS_TOKEN_LIFETIME_SECONDS,
        jti: crypto.randomUUID(),
      };
      const header = {
        alg: "RS256",
        kid: options.keys.active.kid,
        typ: "JWT",
      };
      const signingInput = `${encode(header)}.${encode(claims)}`;
      const signature = crypto
        .createSign("RSA-SHA256")
        .update(signingInput)
        .end()
        .sign(options.keys.active.privateKey)
        .toString("base64url");

      return `${signingInput}.${signature}`;
    },

    verify(token) {
      try {
        const parts = token.split(".");
        if (parts.length !== 3) {
          return null;
        }

        const header = decode(parts[0]);
        const payload = decode(parts[1]);
        if (
          typeof header !== "object" ||
          header === null ||
          typeof payload !== "object" ||
          payload === null
        ) {
          return null;
        }

        const typedHeader = header as Record<string, unknown>;
        const typedPayload = payload as Record<string, unknown>;
        if (
          typedHeader.alg !== "RS256" ||
          typedHeader.typ !== "JWT" ||
          !isString(typedHeader.kid) ||
          !hasExactKeys(typedPayload, EXPECTED_CLAIMS)
        ) {
          return null;
        }

        const publicKey = options.keys.verificationKeys[typedHeader.kid];
        if (publicKey === undefined) {
          return null;
        }

        const validSignature = crypto
          .createVerify("RSA-SHA256")
          .update(`${parts[0]}.${parts[1]}`)
          .end()
          .verify(publicKey, Buffer.from(parts[2], "base64url"));
        if (!validSignature) {
          return null;
        }

        if (
          typedPayload.iss !== options.issuer ||
          typedPayload.aud !== options.audience ||
          !isString(typedPayload.sub) ||
          !isString(typedPayload.sid) ||
          !isString(typedPayload.jti) ||
          !isInteger(typedPayload.iat) ||
          !isInteger(typedPayload.exp)
        ) {
          return null;
        }

        const nowSeconds = Math.floor(now().getTime() / 1000);
        if (typedPayload.exp <= nowSeconds || typedPayload.iat > nowSeconds) {
          return null;
        }

        return typedPayload as unknown as NativeJwtClaims;
      } catch {
        return null;
      }
    },
  };
}