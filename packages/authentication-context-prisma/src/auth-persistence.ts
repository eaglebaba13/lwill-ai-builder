import crypto from "node:crypto";
import argon2 from "argon2";

export interface PasswordCredentialRecord {
  readonly passwordHash: string;
  readonly passwordUpdatedAt: Date;
  readonly passwordVersion: number;
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly userId: string;
  readonly tenantId: string | null;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastSeenAt: Date | null;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

export interface RefreshTokenRecord {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PasswordResetRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export async function createPasswordHash(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPasswordHash(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function createTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
