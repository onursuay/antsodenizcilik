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

    // dataLayer — GTM her zaman okur; GA4 Config tag tetiklenmeden önce de queue'ya girer.
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

    // Meta Pixel — layout.tsx'teki base snippet her zaman yüklüdür.
    // event_id server CAPI ile eşleşir → Meta tarafında browser+server dedup olur.
    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", { value: totalValue, currency: "TRY" }, { eventID: eventId });
    }

    // GA4 doğrudan gtag — GTM asenkron yüklendiği için window.gtag hazır olmayabilir.
    // 3D Secure sonrası fresh page load'da race condition yaşanır; polling ile bekle.
    const fireGtag = () => {
      if (typeof window.gtag === "function") {
        window.gtag("event", "purchase", {
          transaction_id: sepetId,
          value: totalValue,
          currency: "TRY",
          items,
        });
        return true;
      }
      return false;
    };

    if (!fireGtag()) {
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 100;
        if (fireGtag() || elapsed >= 5000) {
          clearInterval(interval);
        }
      }, 100);
    }
  }, [sepetId, biletler]);

  return null;
}
