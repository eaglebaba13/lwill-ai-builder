import { describe, expect, it } from "vitest";
import {
  createPasswordHash,
  createTokenHash,
  verifyPasswordHash,
  type SessionRecord,
} from "./auth-persistence";

describe("phase 1d auth persistence helpers", () => {
  it("hashes passwords one-way and verifies matching credentials", async () => {
    const password = "SuperSecure123!";
    const hash = await createPasswordHash(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$argon2/);
    await expect(verifyPasswordHash(password, hash)).resolves.toBe(true);
    await expect(verifyPasswordHash("WrongPassword", hash)).resolves.toBe(false);
  });

  it("creates deterministic token hashes for persisted secrets", () => {
    const token = "refresh-token-123";

    const firstHash = createTokenHash(token);
    const secondHash = createTokenHash(token);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(token);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("requires a concrete expiry value for persisted sessions", () => {
    const session: SessionRecord = {
      sessionId: "session-1",
      userId: "user-1",
      tenantId: "tenant-1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      lastSeenAt: null,
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
    };

    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
