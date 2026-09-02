import { describe, expect, it } from "vitest";
import {
  createMockChannelAdapter,
  createInAppChannelAdapter,
  createFailingChannelAdapter,
} from "./notification-channel-adapter";

describe("notification channel adapters", () => {
  it("mock adapter returns successful result", async () => {
    const adapter = createMockChannelAdapter();
    const result = await adapter.send({
      recipientId: "user-1",
      channel: "email",
      subject: "Hello",
      body: "World",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("SENT");
    expect(result.errorMessage).toBeNull();
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(result.deliveryMode).toBe("MOCK");
  });

  it("in-app adapter returns successful result", async () => {
    const adapter = createInAppChannelAdapter();
    const result = await adapter.send({
      recipientId: "user-1",
      channel: "in-app",
      subject: "Hello",
      body: "World",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("SENT");
    expect(result.errorMessage).toBeNull();
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(result.deliveryMode).toBe("MOCK");
  });

  it("failing adapter returns failed result", async () => {
    const adapter = createFailingChannelAdapter("provider error");
    const result = await adapter.send({
      recipientId: "user-1",
      channel: "whatsapp",
      subject: "Hello",
      body: "World",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("provider error");
    expect(result.sentAt).toBeNull();
    expect(result.deliveryMode).toBe("MOCK");
  });
});
