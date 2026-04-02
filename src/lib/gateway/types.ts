export interface PaymentGateway {
  createCheckoutUrl(
    paymentId: string,
    amountKurus: number,
    currency: string
  ): Promise<string>;

  verifyWebhookSignature(body: string, signature: string): boolean;

  pollPaymentStatus(
    gatewayReferenceId: string
  ): Promise<"SETTLED" | "FAILED" | "PENDING">;

  submitRefund(
    gatewayReferenceId: string,
    amountKurus: number
  ): Promise<string>;
}

export interface GatewayWebhookPayload {
  gatewayReferenceId: string;
  status: "SETTLED" | "FAILED";
  amountKurus: number;
  currency: string;
  metadata?: Record<string, unknown>;
}
