import type { PaymentGateway } from "./types";
import { createIyzicoGateway } from "./iyzico";

export function getGateway(): PaymentGateway {
  const gateway = process.env.PAYMENT_GATEWAY;

  if (!gateway) {
    throw new Error(
      "PAYMENT_GATEWAY environment variable is required. Set it to 'iyzico' (or another supported provider)."
    );
  }

  switch (gateway) {
    case "iyzico":
      return createIyzicoGateway();
    default:
      throw new Error(
        `Unsupported PAYMENT_GATEWAY: "${gateway}". Supported: iyzico`
      );
  }
}
