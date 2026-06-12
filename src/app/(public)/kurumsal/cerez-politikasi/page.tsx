import { redirect } from "next/navigation";

// Çerez politikası tek sayfada toplandı: /kvkk (Çerez Politikası + KVKK).
// Eski adres kalıcı olarak oraya yönlendirilir.
export default function CerezPolitikasiPage() {
  redirect("/kvkk");
}
