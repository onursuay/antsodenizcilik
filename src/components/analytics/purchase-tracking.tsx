"use client";

import { useEffect } from "react";

interface Bilet {
  id: number;
  ticket_serial_number: string;
  price_100: number;
  trip_number: string;
  departure_port: string;
  arrival_port: string;
}

interface Props {
  sepetId: string;
  biletler: Bilet[];
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: (...args: any[]) => void;
  }
}

export function PurchaseTracking({ sepetId, biletler }: Props) {
  useEffect(() => {
    if (!biletler.length) return;
    if (typeof window === "undefined") return;

    const totalValue = biletler.reduce((sum, b) => sum + b.price_100, 0) / 100;
    const eventId = `purchase.${sepetId}`;

    // GA4 Enhanced Ecommerce — GTM'deki GA4/Google Ads tag'ları bu event'i dinler.
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: "purchase",
      event_id: eventId,
      ecommerce: {
        transaction_id: sepetId,
        value: totalValue,
        currency: "TRY",
        items: biletler.map((b) => ({
          item_id: b.ticket_serial_number,
          item_name: `${b.departure_port} → ${b.arrival_port}`,
          item_category: b.trip_number,
          price: b.price_100 / 100,
          quantity: 1,
        })),
      },
    });

    // Meta Pixel — GTM üzerinden yüklenen fbq'yu doğrudan çağır.
    // event_id server CAPI ile eşleşir → Meta tarafında browser+server dedup olur.
    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", { value: totalValue, currency: "TRY" }, { eventID: eventId });
    }
  }, [sepetId, biletler]);

  return null;
}
