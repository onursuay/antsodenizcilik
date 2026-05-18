// GA4 Enhanced Ecommerce + Meta Pixel funnel event'leri.
// Tüm event'ler dataLayer'a push edilir; GTM tag'ları (GA4, Meta Pixel) custom event trigger
// olarak buradaki event isimlerini dinler.
//
// Event eşleşmesi:
//   view_search_results  → Meta: Search
//   begin_checkout       → Meta: InitiateCheckout
//   add_payment_info     → Meta: AddPaymentInfo
//   purchase             → Meta: Purchase (purchase-tracking.tsx içinde)

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function safePush(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
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
  safePush({
    event: "view_search_results",
    search_term: `${params.from} → ${params.to}`,
    departure: params.from,
    arrival: params.to,
    travel_date: params.date,
    trip_type: params.tripType,
    passenger_count: params.passengers,
  });
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
}

// "Dönüş planınız nedir?" 3 buton — aynı gün / birkaç gün sonra / emin değilim
export function trackReturnPlanSelect(plan: "same_day" | "multi_day" | "unsure") {
  safePush({
    event: "ticket_donus_plani_secimi",
    plan_secimi: plan,
  });
}

// Alternatif sefer önerisinden tarih seçimi (gidiş veya dönüş için)
export function trackAlternativeSailingSelect(params: {
  direction: "gidis" | "donus";
  date: string;
  time?: string;
}) {
  safePush({
    event: "ticket_uygun_sefer_secimi",
    yon: params.direction,
    tarih: params.date,
    saat: params.time ?? "",
  });
}
