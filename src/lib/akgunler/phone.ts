// Akgünler tel_no regex: /^[A-Za-z0-9-+ ]*$/, max 32 karakter.
// Güvenli olması için yalnızca rakam + opsiyonel başta '+' bırakıyoruz.
export function sanitizePhone(phone: string): string {
  const digitsAndPlus = phone.replace(/[^\d+]/g, "");
  const cleaned = digitsAndPlus.replace(/(?!^)\+/g, "");
  return cleaned.slice(0, 32);
}
