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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

export function PurchaseTracking({ sepetId, biletler }: Props) {
  useEffect(() => {
    if (!biletler.length) return;
    if (typeof window === "undefined") return;

    const totalValue = biletler.reduce((sum, b) => sum + b.price_100, 0) / 100;
    const eventId = `purchase.${sepetId}`;
    const items = biletler.map((b) => ({
      item_id: b.ticket_serial_number,
      item_name: `${b.departure_port} → ${b.arrival_port}`,
      item_category: b.trip_number,
      price: b.price_100 / 100,
      quantity: 1,
    }));

    // GA4 — GTM bağımlılığı olmadan doğrudan gtag ile gönder.
    // GTM her halükarda window.gtag'ı yükler (GA4 Config tag).
    if (typeof window.gtag === "function") {
      window.gtag("event", "purchase", {
        transaction_id: sepetId,
        value: totalValue,
        currency: "TRY",
        items,
      });
    }

    // dataLayer — GTM'de purchase tag'ı varsa oradan da gider (belt-and-suspenders).
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: "purchase",
      event_id: eventId,
      ecommerce: {
        transaction_id: sepetId,
        value: totalValue,
        currency: "TRY",
        items,
      },
    });

    // Meta Pixel — GTM üzerinden yüklenen fbq + layout.tsx'teki base snippet.
    // event_id server CAPI ile eşleşir → Meta tarafında browser+server dedup olur.
    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", { value: totalValue, currency: "TRY" }, { eventID: eventId });
    }
  }, [sepetId, biletler]);

  return null;
}
