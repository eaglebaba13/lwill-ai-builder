export interface NotificationRetryPolicy {
  readonly maxAttempts: number;
  readonly retryDelayMs: number;
}

export interface NotificationRetryPolicyService {
  readonly policy: NotificationRetryPolicy;
}

export function createNotificationRetryPolicy(): NotificationRetryPolicyService {
  return {
    policy: {
      maxAttempts: 3,
      retryDelayMs: 60_000,
    },
  };
}
