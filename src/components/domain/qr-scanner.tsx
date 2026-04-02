"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<string>("qr-reader-" + Math.random().toString(36).slice(2));

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      containerRef.current,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (errorMessage) => {
        // Scan errors are expected while scanning — ignore silently
        void errorMessage;
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">QR Tarayici</span>
        <button
          onClick={() => {
            scannerRef.current?.clear().catch(() => {});
            onClose();
          }}
          className="text-sm text-gray-500 hover:underline"
        >
          Kapat
        </button>
      </div>
      <div id={containerRef.current} />
    </div>
  );
}
