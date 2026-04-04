"use client";

import { PublicBookingCheckoutPage } from "@/components/domain/akgunler/public-booking-flow";
import { useParams } from "next/navigation";

export default function BookingWizardPage() {
  const params = useParams<{ id: string }>();

  return <PublicBookingCheckoutPage sessionId={params.id} />;
}
