import { redirect } from "next/navigation";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ sid?: string; ct?: string }>;
}) {
  const { sid, ct } = await searchParams;
  const sepetId = parseInt(sid ?? "0");
  const cartToken = ct ?? "";

  if (!sepetId || !cartToken) {
    redirect("/");
  }

  return <CheckoutClient sepetId={sepetId} cartToken={cartToken} />;
}
