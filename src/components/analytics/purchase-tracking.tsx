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
    fbq?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

// 1) dataLayer.push — GA4 Enhanced Ecommerce / GTM tag'ları için (Meta Pixel GTM tag'ı varsa o yakalar)
// 2) fbq('track', 'Purchase', ...) — Meta Pixel doğrudan ateşleme (fallback, GTM tag yoksa garanti)
//    Eğer GTM'de de Pixel Purchase tag'ı kurarsanız çift event olur; o durumda GTM tag'ı kaldırın
//    veya buradaki fbq çağrısını kapatın.
export function PurchaseTracking({ sepetId, biletler }: Props) {
  useEffect(() => {
    if (!biletler.length) return;
    if (typeof window === "undefined") return;

    const totalValue = biletler.reduce((sum, b) => sum + b.price_100, 0) / 100;

    // (1) dataLayer event
    window.dataLayer = window.dataLayer ?? [];
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

    // (2) Meta Pixel doğrudan Purchase event
    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", {
        value: totalValue,
        currency: "TRY",
        content_ids: [sepetId],
        content_type: "product",
        num_items: biletler.length,
      });
    }
  }, [sepetId, biletler]);

  return null;
}
