"use client";

import { BrandLogo } from "@/components/ui/brand-logo";

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
      <div className="booking-loading-panel w-full max-w-3xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col items-center px-6 py-9 text-center sm:px-10 sm:py-10">
          <BrandLogo
            priority
            className="w-full max-w-[220px]"
            imageClassName="h-auto w-full object-contain"
          />
          <p className="mt-6 text-lg font-semibold text-slate-900">{title}</p>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">{description}</p>

          <div className="mt-6 w-full max-w-lg rounded-full bg-slate-100 p-1">
            <div className="booking-loading-bar h-2.5 rounded-full bg-brand-mist" />
          </div>
        </div>
      </div>
    </div>
  );
}
