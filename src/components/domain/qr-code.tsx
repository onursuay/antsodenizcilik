"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      { width: size, margin: 2 },
      (err) => {
        if (err) {
          console.error("QR code generation failed:", err);
          setError(true);
        }
      }
    );
  }, [value, size]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded border bg-gray-50 text-xs text-gray-400"
        style={{ width: size, height: size }}
      >
        QR kod olusturulamadi
      </div>
    );
  }

  return <canvas ref={canvasRef} />;
}
