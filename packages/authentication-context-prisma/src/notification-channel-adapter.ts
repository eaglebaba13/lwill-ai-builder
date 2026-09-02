export interface NotificationChannelAdapter {
  readonly name: string;
  send(input: {
    readonly recipientId: string | null;
    readonly channel: string;
    readonly subject: string | null;
    readonly body: string;
  }): Promise<NotificationDeliveryResult>;
}

export interface NotificationDeliveryResult {
  readonly success: boolean;
  readonly status: string;
  readonly errorMessage: string | null;
  readonly sentAt: Date | null;
  readonly deliveredAt: Date | null;
}

export function createMockChannelAdapter(): NotificationChannelAdapter {
  return {
    name: "mock",
    async send({ recipientId, channel, subject, body }) {
      const sentAt = new Date();
      return {
        success: true,
        status: "SENT",
        errorMessage: null,
        sentAt,
        deliveredAt: sentAt,
      };
    },
  };
}

export function createInAppChannelAdapter(): NotificationChannelAdapter {
  return {
    name: "in-app",
    async send({ recipientId, channel, subject, body }) {
      const sentAt = new Date();
      return {
        success: true,
        status: "SENT",
        errorMessage: null,
        sentAt,
        deliveredAt: null,
      };
    },
  };
}

export function createFailingChannelAdapter(errorMessage: string): NotificationChannelAdapter {
  return {
    name: "failing",
    async send() {
      return {
        success: false,
        status: "FAILED",
        errorMessage,
        sentAt: null,
        deliveredAt: null,
      };
    },
  };
}
