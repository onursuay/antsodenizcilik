"use client";

import { PublicBookingResultsPage } from "@/components/domain/akgunler/public-booking-flow";
import { useParams } from "next/navigation";

export default function VoyageDetailPage() {
  const params = useParams<{ id: string }>();

  return <PublicBookingResultsPage sessionId={params.id} />;
}
