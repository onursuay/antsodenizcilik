/**
 * Checkout API istek tipi.
 * Kart alanları (ccNr, ccCvc2 vb.) kasıtlı olarak dışarıda bırakılmıştır.
 * Kart verisi sunucuya asla ulaşmamalı; tarayıcıdan doğrudan Akgünler'e POST edilir.
 */
export interface CheckoutRequestBody {
  sepetId: number;
  email: string;
  cartToken: string;
  // Kart alanlarını eklemek derleme hatasına neden olur:
  ccNr?: never;
  ccCvc2?: never;
  ccHolder?: never;
  ccExpMonth?: never;
  ccExpYear?: never;
}

export interface AkgunlerResponse<T> {
  durum: "basarili" | "basarisiz";
  hata: string;
  hata_aciklama: string;
  degerler: T;
}

export interface Guzergah {
  id: number;
  baslik: string;
  fiyat_liste_id: number;
}

export interface Sehir {
  id: number;
  ad: string;
  fiyat_liste_id: number;
}

export interface YolcuTuru {
  id: number;
  sofor_yolcu_tur_id: number;
  insan_yas_max: number;
  title: string;
  yolcu_kodu: string;
  yolcu_tipi: "insan" | "diger" | "kabin";
  web_icon: string;
}

export interface GuzergahBilgisi {
  sehirler: Sehir[];
  id: number;
  satis_mod_baslik: string;
  yolcu_turleri: YolcuTuru[];
  populer_ulke_idleri: number[];
}

export interface Sefer {
  id: number;
  secili_mi: boolean;
  sefer_tarih: string;
  full_date: string;
  trip_number: string;
  gemi: string;
  ucret: number;
  indirim: number | null;
  formatted_price: string;
}

export interface Yolcu {
  yolcu_id: number;
  yolcu_tur_id: number;
  yolcu_tipi: "insan" | "diger" | "kabin";
  insan_ulke_id: number;
  insan_ad: string;
  insan_soyad: string;
  insan_pasaport_no: string;
  insan_cinsiyet: string;
  insan_dogum_tarihi: string | null;
  arac_marka_model: string;
  arac_plaka_aciklama: string;
  vergi_tur_id: number | null;
  yolcu_tel_no: string;
  yolcu_tur_ad: string;
  id: number;
  vergi_turleri: Array<{ id: number; aciklama: string }>;
  toplam_fiyat_genel: number;
  toplam_fiyat_yolculuk: number;
  toplam_fiyat_vergi: number;
}

export interface Bilet {
  id: number;
  ticket_serial_number: string;
  sefer_id: number;
  passenger_type_title: string;
  para_birimi_usd_mi: boolean;
  trip_number: string;
  passenger: string;
  yolcu_tipi: string;
  departure_port: string;
  arrival_port: string;
  sefer_tarih: string;
  price_100: number;
  bilet_durumu: string;
}

export interface Ulke {
  id: number;
  title: string;
  ulke_kodu: string;
  ulke_kodu_2: string;
}

export interface YolcuBilgiInput {
  id: number;
  insan_ad: string;
  insan_soyad: string;
  insan_cinsiyet: "E" | "K";
  insan_pasaport_no: string;
  insan_dogum_tarihi: string;
  insan_ulke_id: number;
  yolcu_tel_no?: string;
  vergi_tur_id?: number;
  arac_marka_model?: string;
  arac_plaka_aciklama?: string;
}

export interface YolcuTuruSayi {
  id: number;
  sayi: number;
}
