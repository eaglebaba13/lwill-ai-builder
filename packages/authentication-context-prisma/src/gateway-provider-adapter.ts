export interface GatewayPaymentRequest {
  readonly amountCents: number;
  readonly currency: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface GatewayPaymentResult {
  readonly success: boolean;
  readonly transactionId?: string;
  readonly errorMessage?: string;
  readonly providerResponse?: Record<string, unknown>;
}

export interface GatewayRefundRequest {
  readonly transactionId: string;
  readonly amountCents: number;
  readonly reason?: string;
}

export interface GatewayRefundResult {
  readonly success: boolean;
  readonly refundId?: string;
  readonly errorMessage?: string;
}

export interface GatewayProviderAdapter {
  readonly provider: string;
  processPayment(config: Record<string, unknown>, request: GatewayPaymentRequest): Promise<GatewayPaymentResult>;
  processRefund?(config: Record<string, unknown>, request: GatewayRefundRequest): Promise<GatewayRefundResult>;
}
