import { describe, expect, it } from "vitest";
import { createNotificationRetryPolicy } from "./notification-retry-policy";

describe("notification retry policy", () => {
  it("exposes maxAttempts = 3", () => {
    const policy = createNotificationRetryPolicy().policy;
    expect(policy.maxAttempts).toBe(3);
  });

  it("exposes retryDelayMs = 60000", () => {
    const policy = createNotificationRetryPolicy().policy;
    expect(policy.retryDelayMs).toBe(60_000);
  });
});
