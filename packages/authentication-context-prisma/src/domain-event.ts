export interface DomainEvent {
  readonly eventType: string;
  readonly tenantId: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: Date;
}

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

export function createDomainEvent(
  eventType: string,
  tenantId: string,
  payload: Record<string, unknown>,
): DomainEvent {
  return {
    eventType,
    tenantId,
    payload,
    timestamp: new Date(),
  };
}
