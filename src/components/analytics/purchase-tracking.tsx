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
  }
}

// GA4 Enhanced Ecommerce standardında dataLayer.push.
// GTM'deki Meta Pixel Purchase, GA4 Purchase, Google Ads Conversion tag'larının
// hepsi bu tek "purchase" event'ini trigger olarak kullanabilir.
export function PurchaseTracking({ sepetId, biletler }: Props) {
  useEffect(() => {
    if (!biletler.length) return;
    if (typeof window === "undefined") return;

    const totalValue = biletler.reduce((sum, b) => sum + b.price_100, 0) / 100;

    window.dataLayer = window.dataLayer ?? [];
    // Önceki ecommerce nesnesini temizle (GTM önerisi — sıralı purchase'larda kirlenme olmasın)
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: "purchase",
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
  }, [sepetId, biletler]);

  return null;
}
