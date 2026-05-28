// GA4 Enhanced Ecommerce + Meta Pixel funnel event'leri.
// Her fonksiyon hem window.gtag (GTM'in yüklediği GA4) hem dataLayer'a yazar.
// GTM import JSON'u publish edilmese bile doğrudan gtag sayesinde GA4'e ulaşır.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: (...args: any[]) => void;
  }
}

function safePush(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

function safeGtag(eventName: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

function safeFbq(eventName: string, params: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", eventName, params);
  }
}

export interface EcommerceItem {
  item_id: string | number;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
}

export function trackSearch(params: {
  from: string;
  to: string;
  date: string;
  tripType?: string;
  passengers?: number;
}) {
  const payload = {
    search_term: `${params.from} → ${params.to}`,
    departure: params.from,
    arrival: params.to,
    travel_date: params.date,
    trip_type: params.tripType,
    passenger_count: params.passengers,
  };
  safePush({ event: "view_search_results", ...payload });
  safeGtag("view_search_results", payload);
  safeFbq("Search", { search_string: payload.search_term });
}

export function trackBeginCheckout(params: {
  value: number;
  currency: string;
  items: EcommerceItem[];
  transactionId?: string | number;
}) {
  safePush({ ecommerce: null });
  safePush({
    event: "begin_checkout",
    ecommerce: {
      transaction_id: params.transactionId,
      value: params.value,
      currency: params.currency,
      items: params.items,
    },
  });
  safeGtag("begin_checkout", {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    items: params.items,
  });
  safeFbq("InitiateCheckout", { value: params.value, currency: params.currency });
}

export function trackAddPaymentInfo(params: {
  value: number;
  currency: string;
  items?: EcommerceItem[];
  paymentType?: string;
  transactionId?: string | number;
}) {
  safePush({ ecommerce: null });
  safePush({
    event: "add_payment_info",
    ecommerce: {
      transaction_id: params.transactionId,
      value: params.value,
      currency: params.currency,
      payment_type: params.paymentType ?? "credit_card",
      items: params.items,
    },
  });
  safeGtag("add_payment_info", {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    payment_type: params.paymentType ?? "credit_card",
    items: params.items,
  });
  safeFbq("AddPaymentInfo", { value: params.value, currency: params.currency });
}

const RETURN_PLAN_EVENT: Record<"same_day" | "multi_day" | "unsure", string> = {
  same_day: "donus_plani_ayni_gun",
  multi_day: "donus_plani_birkac_gun",
  unsure: "donus_plani_emin_degil",
};

export function trackReturnPlanSelect(plan: "same_day" | "multi_day" | "unsure") {
  const eventName = RETURN_PLAN_EVENT[plan];
  safePush({ event: eventName });
  safeGtag(eventName, {});
}

export function trackAlternativeSailingSelect(params: {
  direction: "gidis" | "donus";
  date: string;
  time?: string;
}) {
  const payload = { yon: params.direction, tarih: params.date, saat: params.time ?? "" };
  safePush({ event: "ticket_uygun_sefer_secimi", ...payload });
  safeGtag("ticket_uygun_sefer_secimi", payload);
}
