"use client";

import Image from "next/image";

interface ProcessingOverlayProps {
  open: boolean;
  title: string;
  description: string;
}

export function ProcessingOverlay({
  open,
  title,
  description,
}: ProcessingOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/46 px-4 backdrop-blur-[2px]">
      <div className="booking-loading-panel w-full max-w-xl overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col items-center px-5 py-6 text-center sm:px-7 sm:py-7">
          <Image
            src="/processing-logo.png"
            alt="Antso Denizcilik"
            width={300}
            height={136}
            priority
            className="h-auto w-[150px]"
          />
          <p className="mt-4 text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">{description}</p>

          <div className="mt-5 w-full max-w-lg rounded-full bg-slate-100 p-1">
            <div className="booking-loading-bar h-2 rounded-full bg-brand-mist" />
          </div>
        </div>
      </div>
    </div>
  );
}
