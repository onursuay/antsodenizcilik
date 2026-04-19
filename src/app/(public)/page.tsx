import { PublicBookingHome } from "@/components/domain/akgunler/public-booking-flow";

export default function HomePage() {
  return (
    <>
      <link rel="preload" as="image" href="/hero-sea.jpg" fetchPriority="high" />
      <PublicBookingHome />
    </>
  );
}
