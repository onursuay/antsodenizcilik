import type {
  AkgunlerResponse,
  Guzergah,
  GuzergahBilgisi,
  Sefer,
  Yolcu,
  Bilet,
  Ulke,
  YolcuBilgiInput,
  YolcuTuruSayi,
} from "./types";
import { AkgunlerApiError } from "./errors";

function getConfig() {
  const baseUrl =
    process.env.AKGUNLER_BASE_URL ??
    "https://www.akgunlerbilet.com/akgunler_web_service/api.php";
  const aId = process.env.AKGUNLER_A_ID ?? "2145";
  const akId = process.env.AKGUNLER_AK_ID ?? "777";

  return { baseUrl, aId, akId };
}

async function makeRequest<T>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  const { baseUrl, aId, akId } = getConfig();

  const formData = new URLSearchParams();
  formData.set("a_id", aId);
  formData.set("ak_id", akId);
  formData.set("dil", params.dil ?? "tr");

  for (const [key, value] of Object.entries(params)) {
    if (key !== "dil") formData.set(key, value);
  }

  const res = await fetch(`${baseUrl}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new AkgunlerApiError(
      "http_error",
      `Akgunler API HTTP ${res.status}`
    );
  }

  const data = (await res.json()) as AkgunlerResponse<T>;

  if (data.durum !== "basarili") {
    throw new AkgunlerApiError(data.hata, data.hata_aciklama);
  }

  return data.degerler;
}

// 1. Güzergah listesi
export async function getGuzergahlar(): Promise<Guzergah[]> {
  return makeRequest<Guzergah[]>("getGuzergahlar");
}

// 2. Güzergah bilgileri (şehirler + yolcu türleri)
export async function getGuzergahBilgileri(
  guzergahId: number
): Promise<GuzergahBilgisi> {
  return makeRequest<GuzergahBilgisi>("getGuzergahBilgileri", {
    id: String(guzergahId),
  });
}

// 3. Sefer listesi
export async function getSeferler(params: {
  cikisSehirId: number;
  varisSehirId: number;
  yolculukModu: "tek-gidis" | "gidis-donus" | "donus-acik";
  gidisTarih: string; // dd/mm/yyyy
  donusTarih?: string;
  sepetId?: number;
  yolcuTurleri: YolcuTuruSayi[];
}): Promise<{
  g_seferler: Sefer[];
  d_seferler: Sefer[];
  s_id: number;
}> {
  return makeRequest("getSeferler", {
    sc_id: String(params.cikisSehirId),
    sv_id: String(params.varisSehirId),
    y_mod: params.yolculukModu,
    g_tarih: params.gidisTarih,
    d_tarih: params.donusTarih ?? "",
    s_id: String(params.sepetId ?? 0),
    y_ok: "0",
    y_t: JSON.stringify(params.yolcuTurleri),
  });
}

// 4. Yolcu listesi (sepete ait)
export async function getYolcular(params: {
  sepetId: number;
  gidisSeferId: number;
  donusSeferId?: number;
  yolculukModu: "tek-gidis" | "gidis-donus" | "donus-acik";
}): Promise<{
  yolcular: Yolcu[];
  yolcu_turu_toplamlari: Record<string, { toplam_fiyat_genel: number }>;
}> {
  return makeRequest("getYolcular", {
    s_id: String(params.sepetId),
    gs_id: String(params.gidisSeferId),
    ds_id: String(params.donusSeferId ?? 0),
    y_mod: params.yolculukModu,
  });
}

// 5. Yolcu bilgi ataması
export async function setYolcuBilgisi(
  sepetId: number,
  yolcular: YolcuBilgiInput[]
): Promise<{ toplam_fiyat: number }> {
  return makeRequest("setYolcuBilgisi", {
    s_id: String(sepetId),
    y: JSON.stringify(yolcular),
  });
}

// 7. Bilet oluşturma (3D Secure sonrası)
export async function bileteDonustur3D(params: {
  sepetId: number;
  ccHolder: string;
  email: string;
  price100: number;
  cavv: string;
  eci: string;
  xid: string;
  md: string;
  telNo?: string;
  emailAcente?: string;
}): Promise<Record<string, unknown>> {
  return makeRequest("bileteDonustur3D", {
    s_id: String(params.sepetId),
    cc_holder: params.ccHolder,
    cc_nr: "",
    cc_cvc2: "",
    cc_exp_month: "",
    cc_exp_year: "",
    email: params.email,
    price_100: String(params.price100),
    cavv: params.cavv,
    eci: params.eci,
    xid: params.xid,
    md: params.md,
    tel_no: params.telNo ?? "",
    email_acente: params.emailAcente ?? "",
  });
}

// 8. Rezervasyona ait biletler
export async function getRezervasyonaAitBiletler(
  sepetId: number
): Promise<{ biletler: Bilet[]; s_id: number }> {
  return makeRequest("getRezervasyonaAitBiletler", {
    s_id: String(sepetId),
  });
}

// 9. Ülke listesi
export async function getUlkeler(): Promise<Ulke[]> {
  return makeRequest<Ulke[]>("getUlkeler");
}

// 3D Secure form parametreleri oluştur
export function build3DSecureFormParams(params: {
  sepetId: number;
  ccHolder: string;
  ccNr: string;
  ccCvc2: string;
  ccExpMonth: string;
  ccExpYear: string;
  email: string;
  redirectionUrl: string;
}): Record<string, string> {
  return {
    dil: "tr",
    sepet_id: String(params.sepetId),
    cc_holder: params.ccHolder,
    cc_nr: params.ccNr,
    cc_cvc2: params.ccCvc2,
    cc_exp_month: params.ccExpMonth,
    cc_exp_year: params.ccExpYear,
    email: params.email,
    _redirection_url: params.redirectionUrl,
  };
}

export const AKGUNLER_3D_PAYMENT_URL =
  process.env.AKGUNLER_3D_PAYMENT_URL ??
  "https://www.akgunlerbilet.com/ws_secure_payment.php";
