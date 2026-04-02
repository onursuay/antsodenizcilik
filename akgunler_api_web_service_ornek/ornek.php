<?php
header('Content-Type: text/html; charset=utf-8');

/////////////////////////////////////////////////////////////////
// fonksiyonlar
/////////////////////////////////////////////////////////////////

// istemcinin acente ve acente kullanıcı idleri
define('ACENTA_ID', 1000);
define('ACENTA_KULLANICI_ID', 1000);

function bluecrs_makePostRequest($action = '', $post_data = array()){

	$post_data['a_id'] = ACENTA_ID;
	$post_data['ak_id'] = ACENTA_KULLANICI_ID;
	$post_data['dil'] = array_key_exists('dil', $post_data) ? $post_data['dil'] : 'tr';
	
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, "https://www.akgunlerbilet.com/akgunler_web_service/api.php?action={$action}");
//	curl_setopt($ch, CURLOPT_URL, "http://localhost/akgunler_web_service/api.php?action={$action}");
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
	curl_setopt($ch, CURLOPT_FORBID_REUSE, 1); 
	curl_setopt($ch, CURLOPT_FRESH_CONNECT, 1); 
	$response = curl_exec($ch);
	curl_close($ch);
	
	$return_array = array();
	$return_array['durum'] = 'basarisiz'; //basarili veya basarisiz değerini alabilir
	$return_array['hata'] = '';
	$return_array['hata_aciklama'] = '';
	
	try{
		$r = json_decode($response, true);
		
		if (!is_null($r)){
			$return_array = $r;
		}
	} catch (Exception $e) {die($e->getMessage());}

	return $return_array;
}

//---------------------------------------------------------------
// fonksiyonlar - son
//---------------------------------------------------------------




 goto guzergah_listesi;
// goto guzergah_bilgileri;
// goto sefer_listesi;
// goto yolcu_listesi;
// goto yolcu_bilgi_atamasi;
// goto start_3ds;
// goto bilet_olusturma;
// goto rezervasyona_ait_biletler;
// goto ulke_listesi;

exit();





guzergah_listesi:
/////////////////////////////////////////////////////////////////
// 1.0 - güzergah listesi
// başarılı durumda degerler anahtarında 
// rota/güzergah
// dizisini döndürür
/////////////////////////////////////////////////////////////////

$array_response = bluecrs_makePostRequest('getGuzergahlar');

//echo json_encode($array_response);

/*
{"durum":"basarili","hata":"","hata_aciklama":"","degerler":[{"id":2,"baslik":"TASUCU - GIRNE - TASUCU","fiyat_liste_id":29},{"id":12,"baslik":"MERS\u0130N-G\u0130RNE-MERS\u0130N","fiyat_liste_id":12},{"id":17,"baslik":"MERS\u0130N-MAGUSA-MERS\u0130N","fiyat_liste_id":30},{"id":18,"baslik":"MA\u011eUSA-TA\u015eUCU-MA\u011eUSA","fiyat_liste_id":6},{"id":19,"baslik":"G\u0130RNE-ALANYA-G\u0130RNE","fiyat_liste_id":14}]}
*/

$array_guzergahlar = array();
if ($array_response['durum'] == 'basarili'){
	$array_guzergahlar = $array_response['degerler'];
}
exit();

//---------------------------------------------------------------
// 1.0 - güzergah listesi - son
//---------------------------------------------------------------




guzergah_bilgileri:
/////////////////////////////////////////////////////////////////
// 2.0 - rotada satılabilecek yolcu kodları listesi
// başarılı durumda degerler anahtarında rotaya ait
// şehirler, 
// yolcu türleri,
// popüler ülke idleri (maksimum en popüler 8 ülke idsi döner)
// dizilerini döndürür
/////////////////////////////////////////////////////////////////

$array_post_fields = array();
$array_post_fields['id'] = 2; // rota/güzergah id
$array_post_fields['dil'] = 'tr'; // tr | en

$array_response = bluecrs_makePostRequest('getGuzergahBilgileri', $array_post_fields);

//echo json_encode($array_response);

/*
{"durum":"basarili","hata":"","hata_aciklama":"","degerler":{"sehirler":[{"id":7,"ad":"Girne","fiyat_liste_id":29},{"id":8,"ad":"Tasucu","fiyat_liste_id":29}],"id":2,"satis_mod_baslik":"TASUCU - GIRNE - TASUCU","yolcu_turleri":[{"id":1,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"S\u0130V\u0130L (12+)","yolcu_kodu":"SIVIL","yolcu_tipi":"insan","web_icon":""},{"id":6,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"OGRENCI","yolcu_kodu":"OGRENCI","yolcu_tipi":"insan","web_icon":""},{"id":223,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"ASKER M(ASK)","yolcu_kodu":"ASKER","yolcu_tipi":"insan","web_icon":""},{"id":40,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"ASKER \/ SUBAY","yolcu_kodu":"ASKERSUBAY","yolcu_tipi":"insan","web_icon":""},{"id":41,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"GAZ\u0130 \/ D\u0130PLOMAT","yolcu_kodu":"GHDP","yolcu_tipi":"insan","web_icon":""},{"id":42,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"ASKER A\u0130LES\u0130","yolcu_kodu":"ASKERESI","yolcu_tipi":"insan","web_icon":""},{"id":2,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"\u00c7OCUK 7-12 YA\u015e","yolcu_kodu":"COCUK","yolcu_tipi":"insan","web_icon":""},{"id":4,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"BEBEK 3-6 YA\u015e","yolcu_kodu":"INFANT","yolcu_tipi":"insan","web_icon":""},{"id":3,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"BEBEK 0-2 YA\u015e","yolcu_kodu":"INFANT ","yolcu_tipi":"insan","web_icon":""},{"id":16,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"SALOON","yolcu_kodu":"SALOON ","yolcu_tipi":"diger","web_icon":""},{"id":25,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"JEEP","yolcu_kodu":"JEEP","yolcu_tipi":"diger","web_icon":""},{"id":21,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"M\u0130N\u0130B\u00dcS","yolcu_kodu":"MINIBUS","yolcu_tipi":"diger","web_icon":""},{"id":44,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"KAMYON","yolcu_kodu":"KAMYON","yolcu_tipi":"diger","web_icon":""},{"id":49,"sofor_yolcu_tur_id":45,"insan_yas_max":0,"title":"KAMYON 2","yolcu_kodu":"KAMYON ","yolcu_tipi":"diger","web_icon":""},{"id":219,"sofor_yolcu_tur_id":223,"insan_yas_max":0,"title":"KAMYON (Ask)","yolcu_kodu":"KAMYON","yolcu_tipi":"diger","web_icon":""},{"id":54,"sofor_yolcu_tur_id":45,"insan_yas_max":0,"title":"KAMYONET 2","yolcu_kodu":"KAMYONET ","yolcu_tipi":"diger","web_icon":""},{"id":10,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"KAMYONET","yolcu_kodu":"KAMYONET","yolcu_tipi":"diger","web_icon":""},{"id":27,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"KARAVAN","yolcu_kodu":"KARAVAN","yolcu_tipi":"diger","web_icon":""},{"id":23,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"OTOB\u00dcS","yolcu_kodu":"OTOBUS","yolcu_tipi":"diger","web_icon":""},{"id":14,"sofor_yolcu_tur_id":224,"insan_yas_max":0,"title":"MOTORS\u0130KLET","yolcu_kodu":"MOTOR","yolcu_tipi":"diger","web_icon":""},{"id":50,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"CABIN 2","yolcu_kodu":"CABIN 2","yolcu_tipi":"kabin","web_icon":" "},{"id":51,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"CABIN 4","yolcu_kodu":"CABIN 4","yolcu_tipi":"kabin","web_icon":" "},{"id":102,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"CABIN for 4 W","yolcu_kodu":"CABIN-4W","yolcu_tipi":"kabin","web_icon":""},{"id":53,"sofor_yolcu_tur_id":45,"insan_yas_max":0,"title":"\u00c7EK\u0130C\u0130","yolcu_kodu":"\u00c7EK\u0130C\u0130","yolcu_tipi":"diger","web_icon":""},{"id":43,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"SOFOR(ASK)","yolcu_kodu":"SOFOR","yolcu_tipi":"insan","web_icon":""},{"id":22,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"R\u00d6MORK","yolcu_kodu":"ROMORK","yolcu_tipi":"diger","web_icon":""},{"id":46,"sofor_yolcu_tur_id":45,"insan_yas_max":0,"title":"TIR","yolcu_kodu":"TIR ","yolcu_tipi":"diger","web_icon":""},{"id":229,"sofor_yolcu_tur_id":223,"insan_yas_max":0,"title":"TIR-M (ASK)","yolcu_kodu":"TIR","yolcu_tipi":"diger","web_icon":""},{"id":177,"sofor_yolcu_tur_id":0,"insan_yas_max":0,"title":"S\u0130V\u0130L GRUP","yolcu_kodu":"S\u0130V\u0130L GRUP","yolcu_tipi":"insan","web_icon":""}],"populer_ulke_idleri":[225,251,250,132,16]}}
*/

$array_sehirler = array();
$array_yolcu_turleri = array();
$array_populer_ulke_idleri = array(); // maksimum en popüler 8 ülke döner
if ($array_response['durum'] == 'basarili'){
	$array_sehirler = $array_response['degerler']['sehirler'];
	$array_yolcu_turleri = $array_response['degerler']['yolcu_turleri'];
	$array_populer_ulke_idleri = $array_response['degerler']['populer_ulke_idleri'];
}

exit();

//---------------------------------------------------------------
// 2.0 - rotada satılabilecek yolcu kodları listesi - son
//---------------------------------------------------------------




sefer_listesi:
/////////////////////////////////////////////////////////////////
// 3.0 - satışa uygun sefer listesi
// başarılı durumda degerler anahtarında
// satışa uygun gidiş seferleri
// satışa uygun dönüş seferleri dizilerini
// ve sepet idsini (s_id) döndürür
/////////////////////////////////////////////////////////////////

$array_post_fields = array();
$array_post_fields['sc_id'] = 7; // güzergaha ait çıkış şehir id - Girne
$array_post_fields['sv_id'] = 8; // güzergaha ait varış şehir id - Tasucu
$array_post_fields['y_mod'] = 'tek-gidis'; // yolculuk modu ('tek-gidis', 'gidis-donus', 'donus-acik')
$array_post_fields['g_tarih'] = '08/09/2020'; // gidiş tarihi ('d/m/Y' formatında)
$array_post_fields['d_tarih'] = ''; // dönüş tarihi ('d/m/Y' formatında), tek gidiş veya dönüş açıksa boş bırakılmalıdır
$array_post_fields['s_id'] = 0; // sepet id (ilk istekte yeni sepet oluşturulması için 0 gönderilmelidir.)
$array_post_fields['y_ok'] = 0; // 1 ise sepete ait yolcu kayıtları yeniden oluşturulur. s_id sıfırdan büyükse dikkate alınır. eğer s_id oluşmuşsa ve müşteri daha sonra yolcu türlerine ait sayılarda değişiklik yapmışsa (2 adult seçip sefer listesi alındıktan sonra geri dönüp 1 adult 1 çocuk seçilmesi gibi) yeni s_id istenmeyecekse 1 gönderilmelidir.

$array_post_yolcu_turleri = array();
$array_post_yolcu_turleri[] = array('id' => 1, 'sayi' => 2); // 2 x "SİVİL (12+)"
$array_post_yolcu_turleri[] = array('id' => 2, 'sayi' => 1); // 1 x "ÇOCUK 7-12 YAŞ"

$array_post_fields['y_t'] = json_encode($array_post_yolcu_turleri); // yolcu türleri

$array_response = bluecrs_makePostRequest('getSeferler', $array_post_fields);

//echo json_encode($array_response);

/*
{"durum":"basarili","hata":"","hata_aciklama":"","degerler":{"g_seferler":[{"id":11725,"secili_mi":true,"sefer_tarih":"2020-09-08 00:00","full_date":"2020-09-08 00:00:00.0000000 +03:00","trip_number":"GT00003791","gemi":"M\/F LADY SU (Feribot)","ucret":14224,"indirim":null,"formatted_price":"142,24 TL"},{"id":11726,"secili_mi":false,"sefer_tarih":"2020-09-09 00:00","full_date":"2020-09-09 00:00:00.0000000 +03:00","trip_number":"GT00003792","gemi":"M\/F LADY SU (Feribot)","ucret":14224,"indirim":null,"formatted_price":"142,24 TL"},{"id":11727,"secili_mi":false,"sefer_tarih":"2020-09-10 00:00","full_date":"2020-09-10 00:00:00.0000000 +03:00","trip_number":"GT00003793","gemi":"M\/F LADY SU (Feribot)","ucret":14224,"indirim":null,"formatted_price":"142,24 TL"},{"id":11728,"secili_mi":false,"sefer_tarih":"2020-09-11 00:00","full_date":"2020-09-11 00:00:00.0000000 +03:00","trip_number":"GT00003794","gemi":"M\/F LADY SU (Feribot)","ucret":14224,"indirim":null,"formatted_price":"142,24 TL"},{"id":11729,"secili_mi":false,"sefer_tarih":"2020-09-12 00:00","full_date":"2020-09-12 00:00:00.0000000 +03:00","trip_number":"GT00003795","gemi":"M\/F LADY SU (Feribot)","ucret":14224,"indirim":null,"formatted_price":"142,24 TL"}],"d_seferler":[],"s_id":3667708}}
*/

// NOT: sefer dizilerindeki 'secili_mi' anahtarı müşterinin istediği tarihle birebir uyuşma olması durumunda 1 değerini alır

$array_seferler_gidis = array();
$array_seferler_donus = array();
$sepet_id = 0;
if ($array_response['durum'] == 'basarili'){
	$array_seferler_gidis = $array_response['degerler']['g_seferler'];
	$array_seferler_donus = $array_response['degerler']['d_seferler'];
	$sepet_id = $array_response['degerler']['s_id'];
}

exit();

//---------------------------------------------------------------
// 3.0 - satışa uygun sefer listesi - son
//---------------------------------------------------------------




yolcu_listesi:
/////////////////////////////////////////////////////////////////
// 4.0 - sepete ait yolcu listesi
// başarılı durumda degerler anahtarında
// yolcu
// dizisini döndürür
/////////////////////////////////////////////////////////////////

$array_post_fields = array();
$array_post_fields['s_id'] = 3667708; // sepet id
$array_post_fields['gs_id'] = 11725; // gidiş sefer id
$array_post_fields['ds_id'] = 0; // dönüş sefer id , tek gidiş veya dönüş açıksa 0 atanmalıdır
$array_post_fields['y_mod'] = 'tek-gidis'; // yolculuk modu ('tek-gidis', 'gidis-donus', 'donus-acik')

$array_response = bluecrs_makePostRequest('getYolcular', $array_post_fields);

//echo json_encode($array_response);

/*
{"durum":"basarili","hata":"","hata_aciklama":"","degerler":{"yolcular":[{"yolcu_id":321,"yolcu_tur_id":1,"yolcu_tipi":"insan","insan_ulke_id":0,"insan_ad":"","insan_soyad":"","insan_pasaport_no":"","insan_cinsiyet":" ","insan_dogum_tarihi":null,"arac_marka_model":"","arac_plaka_aciklama":"","vergi_tur_id":null,"yolcu_tel_no":"","yolcu_tur_ad":"S\u0130V\u0130L (12+)","id":321,"vergi_turleri":[],"toplam_fiyat_genel":112,"toplam_fiyat_yolculuk":112,"toplam_fiyat_vergi":0},{"yolcu_id":322,"yolcu_tur_id":1,"yolcu_tipi":"insan","insan_ulke_id":0,"insan_ad":"","insan_soyad":"","insan_pasaport_no":"","insan_cinsiyet":" ","insan_dogum_tarihi":null,"arac_marka_model":"","arac_plaka_aciklama":"","vergi_tur_id":null,"yolcu_tel_no":"","yolcu_tur_ad":"S\u0130V\u0130L (12+)","id":322,"vergi_turleri":[],"toplam_fiyat_genel":112,"toplam_fiyat_yolculuk":112,"toplam_fiyat_vergi":0},{"yolcu_id":323,"yolcu_tur_id":2,"yolcu_tipi":"insan","insan_ulke_id":0,"insan_ad":"","insan_soyad":"","insan_pasaport_no":"","insan_cinsiyet":" ","insan_dogum_tarihi":null,"arac_marka_model":"","arac_plaka_aciklama":"","vergi_tur_id":10,"yolcu_tel_no":"","yolcu_tur_ad":"\u00c7OCUK 7-12 YA\u015e","id":323,"vergi_turleri":[{"id":18,"aciklama":"(Girne) Hudut ge\u00e7i\u015f belgeli Asker vergisi"},{"id":10,"aciklama":"Girne \u00c7\u0131k\u0131\u015f Vergisi"}],"toplam_fiyat_genel":14000,"toplam_fiyat_yolculuk":10000,"toplam_fiyat_vergi":4000}],"yolcu_turu_toplamlari":{"1":{"toplam_fiyat_genel":224},"2":{"toplam_fiyat_genel":14000}}}}
*/

// NOT: vergi_turleri anahtarına ait dizide birden fazla değer olan yolcular için Array ([id] => [aciklama] => ) formatında dizi döner

$array_yolcular = array();
if ($array_response['durum'] == 'basarili'){
	$array_yolcular = $array_response['degerler']['yolcular'];
}

exit();

//---------------------------------------------------------------
// 4.0 - sepete ait yolcu listesi - son
//---------------------------------------------------------------




yolcu_bilgi_atamasi:
/////////////////////////////////////////////////////////////////
// 5.0 - yolcu bilgi ataması
// başarılı durumda degerler anahtarında
// (sepete ait toplam fiyat (TL) * 100)
// değerini döndürür
/////////////////////////////////////////////////////////////////

$array_post_fields = array();
$array_post_fields['s_id'] = 6348806; //3667708; // sepet id

$array_post_yolcu_bilgileri = array();
$array_post_yolcu_bilgileri[] = array(
	'id' => 321, // yolcu id
	'insan_ad' => 'SİVİLAD1', // yolcu_tipi "insan" olan yolcular için zorunlu, maksimum 32 karakter
	'insan_soyad' => 'SİVİLSOYAD1', // yolcu_tipi "insan" olan yolcular için zorunlu, maksimum 32 karakter
	'insan_cinsiyet' => 'E', // yolcu_tipi "insan" olan yolcular için zorunlu, ('E', 'K')
	'insan_pasaport_no' => 'P12345', // yolcu_tipi "insan" olan yolcular için zorunlu, Türkiye - Kıbrıs hatları için tc kimlik veya pasaport no gönderilebilir. regex /^[A-Za-z0-9- ]*$/
	'insan_dogum_tarihi' => '01/06/1974', // yolcu_tipi "insan" olan yolcular için zorunlu, 'd/m/Y' formatında
	'insan_ulke_id' => 225, // yolcu_tipi "insan" olan yolcular için zorunlu, ülke id
	'yolcu_tel_no' => '5521234567', // gönderilmesi isteğe bağlı. maksimum 32 karakter, regex /^[A-Za-z0-9-+ ]*$/
	'vergi_tur_id' => 0, // sadece vergi türü seçeneği birden fazla olan yolcular için
	'arac_marka_model' => '', // yolcu_tipi "diger" olan yolcular için zorunlu, maksimum 80 karakter, regex /^[A-Za-z0-9- ]*$/
	'arac_plaka_aciklama' => '' // yolcu_tipi "diger" olan yolcular için zorunlu, maksimum 100 karakter, regex /^[A-Za-z0-9- ]*$/
);
$array_post_yolcu_bilgileri[] = array(
	'id' => 322, // yolcu id
	'insan_ad' => 'SİVİLAD2', // yolcu_tipi "insan" olan yolcular için zorunlu, maksimum 32 karakter
	'insan_soyad' => 'SİVİLSOYAD2', // yolcu_tipi "insan" olan yolcular için zorunlu, maksimum 32 karakter
	'insan_cinsiyet' => 'K', // yolcu_tipi "insan" olan yolcular için zorunlu, ('E', 'K')
	'insan_pasaport_no' => 'P4567', // yolcu_tipi "insan" olan yolcular için zorunlu, Türkiye - Kıbrıs hatları için tc kimlik veya pasaport no gönderilebilir. regex /^[A-Za-z0-9- ]*$/
	'insan_dogum_tarihi' => '17/09/1978', // yolcu_tipi "insan" olan yolcular için zorunlu, 'd/m/Y' formatında
	'insan_ulke_id' => 225, // yolcu_tipi "insan" olan yolcular için zorunlu, ülke id
	'yolcu_tel_no' => '5558765432', // gönderilmesi isteğe bağlı. maksimum 32 karakter, regex /^[A-Za-z0-9-+ ]*$/
	'vergi_tur_id' => 0, // sadece vergi türü seçeneği birden fazla olan yolcular için
	'arac_marka_model' => '', // yolcu_tipi "diger" olan yolcular için zorunlu, maksimum 80 karakter, regex /^[A-Za-z0-9- ]*$/
	'arac_plaka_aciklama' => '' // yolcu_tipi "diger" olan yolcular için zorunlu, maksimum 100 karakter, regex /^[A-Za-z0-9- ]*$/
);

$array_post_yolcu_bilgileri[] = array(
	'id' => 323, // yolcu id
	'insan_ad' => 'COCUKAD', // yolcu_tipi "insan" olan yolcular için zorunlu, maksimum 32 karakter
	'insan_soyad' => 'COCUKSOYAD', // yolcu_tipi "insan" olan yolcular için zorunlu, maksimum 32 karakter
	'insan_cinsiyet' => 'K', // yolcu_tipi "insan" olan yolcular için zorunlu, ('E', 'K')
	'insan_pasaport_no' => 'P98765', // yolcu_tipi "insan" olan yolcular için zorunlu, Türkiye - Kıbrıs hatları için tc kimlik veya pasaport no gönderilebilir. regex /^[A-Za-z0-9- ]*$/
	'insan_dogum_tarihi' => '23/11/2017', // yolcu_tipi "insan" olan yolcular için zorunlu, 'd/m/Y' formatında
	'insan_ulke_id' => 225, // yolcu_tipi "insan" olan yolcular için zorunlu, ülke id
	'yolcu_tel_no' => '', // gönderilmesi isteğe bağlı. maksimum 32 karakter, regex /^[A-Za-z0-9-+ ]*$/
	'vergi_tur_id' => 10, // sadece vergi türü seçeneği birden fazla olan yolcular için
	'arac_marka_model' => '', // yolcu_tipi "diger" olan yolcular için zorunlu, maksimum 80 karakter, regex /^[A-Za-z0-9- ]*$/
	'arac_plaka_aciklama' => '' // yolcu_tipi "diger" olan yolcular için zorunlu, maksimum 100 karakter, regex /^[A-Za-z0-9- ]*$/
);

$array_post_fields['y'] = json_encode($array_post_yolcu_bilgileri); // yolcu bilgileri

$array_response = bluecrs_makePostRequest('setYolcuBilgisi', $array_post_fields);

//echo json_encode($array_response);

/*
{"durum":"basarili","hata":"","hata_aciklama":"","degerler":{"toplam_fiyat":14224}}
*/

// NOT: sadece durum = 'basarili' ise bilete dönüştürme aşamasına geçilmelidir

$toplam_fiyat = 0;
if ($array_response['durum'] == 'basarili'){
	$toplam_fiyat = $array_response['degerler']['toplam_fiyat']; // toplam fiyat * 100
}

exit();

//---------------------------------------------------------------
// 5.0 - yolcu bilgi ataması - son
//---------------------------------------------------------------




start_3ds:
/////////////////////////////////////////////////////////////////
// 6.0 - 3d-secure ödeme akışının başlatılması
// api'ye ödeme isteği yapılmadan önce müşterinin şifresini
// girebilmesi için bir HTML formunun post edilerek işlemin
// başlatılması gereklidir.
// _redirection_url de tanımlanan adrese sonuçlar post edilir
// result anahtarı success veya error değerini alabilir
// başarılı durumda dönen
// cavv
// eci
// xid
// md
// değerleri kullanılarak api'ye ödeme isteği yapılır
/////////////////////////////////////////////////////////////////

$form_url = 'https://www.akgunlerbilet.com/ws_secure_payment.php';
$dil = 'tr'; // tr | en
$sepet_id = 3667708;
$cc_holder = 'Ad Soyad'; // kredi kartı sahibi adı soyadı
$cc_nr = '4741123456789123'; // kredi kartı numarası
$cc_cvc2 = '123'; // kredi kartı cvc2 no
$cc_exp_month = '02'; // kredi kartı son kullanma tarihi - ay (m formatında)
$cc_exp_year = '21'; // kredi kartı son kullanma tarihi - yıl (yy formatında)
$email = 'ovunct@makonet.net'; // müşteri email adresi
$_redirection_url = 'http://localhost/akgunler_web_service/threeds_results.php'; // sonuçların geri post'lanacağı web adresi

$payment_form =<<<EOF
<html>
<body onload="document.paymentForm.submit();">
<form name="paymentForm" method="post" action="$form_url">
<input type="hidden" name="dil" value="$dil"/>
<input type="hidden" name="sepet_id" value="$sepet_id"/>
<input type="hidden" name="cc_holder" value="$cc_holder"/>
<input type="hidden" name="cc_nr" value="$cc_nr"/>
<input type="hidden" name="cc_cvc2" value="$cc_cvc2"/>
<input type="hidden" name="cc_exp_month" value="$cc_exp_month"/>
<input type="hidden" name="cc_exp_year" value="$cc_exp_year"/>
<input type="hidden" name="email" value="$email"/>
<input type="hidden" name="_redirection_url" value="$_redirection_url"/>
</form>
</body>
</html>
EOF;

echo $payment_form;

exit();

//---------------------------------------------------------------
// 6.0 - start_3ds - son
//---------------------------------------------------------------




bilet_olusturma:
/////////////////////////////////////////////////////////////////
// 7.0 - bilet oluşturma
// başarılı durumda
// sepete ait biletler oluşturulur 
// müşteri email adresine bilet numaraları gönderilir
// acente email adresine bilet numaraları gönderilir (opsiyonel)
/////////////////////////////////////////////////////////////////

$array_post_fields = array();
$array_post_fields['s_id'] = 3667708; // sepet id
$array_post_fields['dil'] = 'tr'; // tr | en
$array_post_fields['cc_holder'] = 'Ad Soyad'; // kredi kartı sahibi adı soyadı
$array_post_fields['cc_nr'] = ''; // kredi kartı numarası - boş gönderilebilir
$array_post_fields['cc_cvc2'] = ''; // kredi kartı cvc2 no - boş gönderilebilir
$array_post_fields['cc_exp_month'] = ''; // kredi kartı son kullanma tarihi - ay (m formatında) - boş gönderilebilir
$array_post_fields['cc_exp_year'] = ''; // kredi kartı son kullanma tarihi - yıl (yy formatında) - boş gönderilebilir
$array_post_fields['email'] = 'ovunct@makonet.net'; // müşteri email adresi
$array_post_fields['price_100'] = 14224; // tahsil edilecek ücret. (TL * 100. yolcu bilgi ataması servisinden dönen toplam_fiyat değeri kullanılabilir) istekler arasında fiyat değişikliği olursa hatali_ucret hatası döner
$array_post_fields['cavv'] = ''; // $_POST['cavv']
$array_post_fields['eci'] = ''; // $_POST['eci']
$array_post_fields['xid'] = ''; // $_POST['xid']
$array_post_fields['md'] = ''; // $_POST['md']
$array_post_fields['tel_no'] = '5301112233'; // opsiyonel. gönderilirse sepete ait tüm yolcuların telefon numaralarını günceller. maksimum 32 karakter, regex /^[A-Za-z0-9-+ ]*$/
$array_post_fields['email_acente'] = 'biletler@acenteadi.com'; // opsiyonel. gönderilirse müşteriye gönderilen emaillerin özel bir kopyası bu adrese de gönderilir

$array_response = bluecrs_makePostRequest('bileteDonustur3D', $array_post_fields);

//echo json_encode($array_response);

/*
Array ( [durum] => basarili [hata] => [hata_aciklama] => [degerler] => Array ( ) )
*/

// NOT: Ödeme başarısızsa [hata] = 'odeme_hatasi', [hata_aciklama] = 'Varsa hata nedeni (cvc yanlış vb.)' döner

if ($array_response['durum'] == 'basarili'){
	// rezervasyona ait biletler servisi kullanılabilir...
}

exit();

//---------------------------------------------------------------
// 7.0 - bilet oluşturma - son
//---------------------------------------------------------------




rezervasyona_ait_biletler:
/////////////////////////////////////////////////////////////////
// 8.0 - rezervasyona ait biletler
// başarılı durumda degerler anahtarında
// biletler
// dizisini döndürür
/////////////////////////////////////////////////////////////////

$array_post_fields = array();
$array_post_fields['s_id'] = 1285550; // sepet id

$array_response = bluecrs_makePostRequest('getRezervasyonaAitBiletler', $array_post_fields);

//echo json_encode($array_response);

/*
{"durum":"basarili","hata":"","hata_aciklama":"","degerler":{"biletler":[{"id":782145,"ticket_serial_number":"MKN-1819","sefer_id":9553,"passenger_type_title":"\u015eof\u00f6r","para_birimi_usd_mi":false,"trip_number":"TG00002615","passenger":"MEHMET SOYAD","yolcu_tipi":"insan","departure_port":"Tasucu","arrival_port":"Girne","sefer_tarih":"2018-05-17 23:30","price_100":5000,"bilet_durumu":"bilet"},{"id":782146,"ticket_serial_number":"MKN-1820","sefer_id":9553,"passenger_type_title":"SALOON","para_birimi_usd_mi":false,"trip_number":"TG00002615","passenger":"12ABC456","yolcu_tipi":"diger","departure_port":"Tasucu","arrival_port":"Girne","sefer_tarih":"2018-05-17 23:30","price_100":20000,"bilet_durumu":"bilet"},{"id":782144,"ticket_serial_number":"MKN-1818","sefer_id":10632,"passenger_type_title":"OGRENCI","para_birimi_usd_mi":false,"trip_number":"TG00002866","passenger":"MELTEM SOYAD","yolcu_tipi":"insan","departure_port":"Tasucu","arrival_port":"Girne","sefer_tarih":"2018-10-05 14:00","price_100":7500,"bilet_durumu":"bilet"}],"s_id":1285550}}
*/

// NOT: bilet durumları: ('acik', 'bilet', 'checkin', 'checkout', 'iptal', 'shipin')

$array_biletler = array();
if ($array_response['durum'] == 'basarili'){
	$array_biletler = $array_response['degerler']['biletler'];
}

exit();

//---------------------------------------------------------------
// 8.0 - rezervasyona ait biletler - son
//---------------------------------------------------------------




ulke_listesi:
/////////////////////////////////////////////////////////////////
// 9.0 - ülke listesi
// başarılı durumda degerler anahtarında 
// ülke
// dizisini döndürür
/////////////////////////////////////////////////////////////////

$array_post_fields = array();
$array_post_fields['dil'] = 'tr'; // tr | en

$array_response = bluecrs_makePostRequest('getUlkeler', $array_post_fields);

//echo json_encode($array_response);

/*
{"durum":"basarili","hata":"","hata_aciklama":"","degerler":[{"id":234,"title":"ABD K\u00fc\u00e7\u00fck D\u0131\u015f Adalar\u0131","ulke_kodu":"UMI","ulke_kodu_2":"UM"},{"id":251,"title":"Afganistan","ulke_kodu":"AFG","ulke_kodu_2":"AF"},{"id":1,"title":"Aland Adalar\u0131","ulke_kodu":"ALA","ulke_kodu_2":"AX"},{"id":84,"title":"Almanya","ulke_kodu":"DEU","ulke_kodu_2":"DE"},{"id":233,"title":"Amerika Birle\u015fik Devletleri","ulke_kodu":"USA","ulke_kodu_2":"US"},{"id":4,"title":"Amerikan Samoas\u0131","ulke_kodu":"ASM","ulke_kodu_2":"AS"},{"id":5,"title":"Andorra","ulke_kodu":"AND","ulke_kodu_2":"AD"},{"id":6,"title":"Angora","ulke_kodu":"AGO","ulke_kodu_2":"AO"},{"id":7,"title":"Anguilla","ulke_kodu":"AIA","ulke_kodu_2":"AI"},{"id":8,"title":"Antarktika","ulke_kodu":"ATA","ulke_kodu_2":"AQ"},{"id":9,"title":"Antigua ve Barbuda","ulke_kodu":"ATG","ulke_kodu_2":"AG"},{"id":10,"title":"Arjantin","ulke_kodu":"ARG","ulke_kodu_2":"AR"},{"id":2,"title":"Arnavutluk","ulke_kodu":"ALB","ulke_kodu_2":"AL"},{"id":12,"title":"Aruba","ulke_kodu":"ABW","ulke_kodu_2":"AW"},{"id":13,"title":"Ascension Adas\u0131","ulke_kodu":"ASC","ulke_kodu_2":"AC"},{"id":14,"title":"Avustralya","ulke_kodu":"AUS","ulke_kodu_2":"AU"},{"id":15,"title":"Avusturya","ulke_kodu":"AUT","ulke_kodu_2":"AT"},{"id":16,"title":"Azerbeycan","ulke_kodu":"AZE","ulke_kodu_2":"AZ"},{"id":17,"title":"Bahamalar","ulke_kodu":"BHS","ulke_kodu_2":"BS"},{"id":18,"title":"Bahreyn","ulke_kodu":"BHR","ulke_kodu_2":"BH"},{"id":20,"title":"Banglade\u015f","ulke_kodu":"BGD","ulke_kodu_2":"BD"},{"id":19,"title":"Barbados","ulke_kodu":"BRB","ulke_kodu_2":"BB"},{"id":245,"title":"Bat\u0131 Sahara","ulke_kodu":"ESH","ulke_kodu_2":"EH"},{"id":22,"title":"Bel\u00e7ika","ulke_kodu":"BEL","ulke_kodu_2":"BE"},{"id":23,"title":"Belize","ulke_kodu":"BLZ","ulke_kodu_2":"BZ"},{"id":24,"title":"Benin","ulke_kodu":"BEN","ulke_kodu_2":"BJ"},{"id":25,"title":"Bermuda","ulke_kodu":"BMU","ulke_kodu_2":"BM"},{"id":21,"title":"Beyaz Rusya","ulke_kodu":"BLR","ulke_kodu_2":"BY"},{"id":231,"title":"Birle\u015fik Arap Emirlikleri","ulke_kodu":"ARE","ulke_kodu_2":"AE"},{"id":182,"title":"Birle\u015fme","ulke_kodu":"REU","ulke_kodu_2":"RE"},{"id":28,"title":"Bolivya","ulke_kodu":"BOL","ulke_kodu_2":"BO"},{"id":29,"title":"Bosna Hersek","ulke_kodu":"BIH","ulke_kodu_2":"BA"},{"id":27,"title":"Botsvana","ulke_kodu":"BWA","ulke_kodu_2":"BW"},{"id":30,"title":"Bouvet Adas\u0131","ulke_kodu":"BVT","ulke_kodu_2":"BV"},{"id":31,"title":"Brezilya","ulke_kodu":"BRA","ulke_kodu_2":"BR"},{"id":32,"title":"Brunei Sultanl\u0131\u011f\u0131","ulke_kodu":"BRN","ulke_kodu_2":"BN"},{"id":33,"title":"Bulgaristan","ulke_kodu":"BGR","ulke_kodu_2":"BG"},{"id":34,"title":"Burkina Faso","ulke_kodu":"BFA","ulke_kodu_2":"BF"},{"id":35,"title":"Burundi","ulke_kodu":"BDI","ulke_kodu_2":"BI"},{"id":26,"title":"Butan","ulke_kodu":"BTN","ulke_kodu_2":"BT"},{"id":232,"title":"B\u00fcy\u00fck Britanya","ulke_kodu":"GBR","ulke_kodu_2":"UK"},{"id":39,"title":"Cape Verde","ulke_kodu":"CPV","ulke_kodu_2":"CV"},{"id":40,"title":"Cayman Adalar\u0131","ulke_kodu":"CYM","ulke_kodu_2":"KY"},{"id":86,"title":"Cebelitar\u0131k","ulke_kodu":"GIB","ulke_kodu_2":"GI"},{"id":3,"title":"Cezayir","ulke_kodu":"DZA","ulke_kodu_2":"DZ"},{"id":45,"title":"Christmas Adas\u0131","ulke_kodu":"CXR","ulke_kodu_2":"CX"},{"id":60,"title":"Cibuti","ulke_kodu":"DJI","ulke_kodu_2":"DJ"},{"id":46,"title":"Cocos (Keeling) Islands","ulke_kodu":"CCK","ulke_kodu_2":"CC"},{"id":51,"title":"Cook Adalar\u0131","ulke_kodu":"COK","ulke_kodu_2":"CK"},{"id":53,"title":"Cote D'Ivoire (Fildi\u015fi Sahili)","ulke_kodu":"CIV","ulke_kodu_2":"CI"},{"id":42,"title":"\u00c7ad","ulke_kodu":"TCD","ulke_kodu_2":"TD"},{"id":57,"title":"\u00c7ek Cumhuriyeti","ulke_kodu":"CZE","ulke_kodu_2":"CZ"},{"id":58,"title":"\u00c7ekoslovakya (eski)","ulke_kodu":"CSK","ulke_kodu_2":"CS"},{"id":44,"title":"\u00c7in","ulke_kodu":"CHN","ulke_kodu_2":"CN"},{"id":59,"title":"Danimarka","ulke_kodu":"DNK","ulke_kodu_2":"DK"},{"id":63,"title":"Do\u011fu Timor","ulke_kodu":"TMP","ulke_kodu_2":"TP"},{"id":62,"title":"Dominik Cumhuriyeti","ulke_kodu":"DOM","ulke_kodu_2":"DO"},{"id":61,"title":"Dominika","ulke_kodu":"DMA","ulke_kodu_2":"DM"},{"id":64,"title":"Ekvador","ulke_kodu":"ECU","ulke_kodu_2":"EC"},{"id":67,"title":"Ekvator Ginesi","ulke_kodu":"GNQ","ulke_kodu_2":"GQ"},{"id":66,"title":"El Salvador","ulke_kodu":"SLV","ulke_kodu_2":"SV"},{"id":105,"title":"Endonezya","ulke_kodu":"IDN","ulke_kodu_2":"ID"},{"id":68,"title":"Eritre","ulke_kodu":"ERI","ulke_kodu_2":"ER"},{"id":11,"title":"Ermenistan","ulke_kodu":"ARM","ulke_kodu_2":"AM"},{"id":69,"title":"Estonya","ulke_kodu":"EST","ulke_kodu_2":"EE"},{"id":70,"title":"Etiyopya","ulke_kodu":"ETH","ulke_kodu_2":"ET"},{"id":80,"title":"F.Y.R.O.M. (Makedonya)","ulke_kodu":"MKD","ulke_kodu_2":"MK"},{"id":71,"title":"Falkland Adalar\u0131 (Malvinas)","ulke_kodu":"FLK","ulke_kodu_2":"FK"},{"id":72,"title":"Faroe Adalar\u0131","ulke_kodu":"FRO","ulke_kodu_2":"FO"},{"id":150,"title":"Fas","ulke_kodu":"MAR","ulke_kodu_2":"MA"},{"id":73,"title":"Fiji","ulke_kodu":"FJI","ulke_kodu_2":"FJ"},{"id":176,"title":"Filipinler","ulke_kodu":"PHL","ulke_kodu_2":"PH"},{"id":171,"title":"Filistin, \u0130\u015fgal edilmi\u015f","ulke_kodu":"PSE","ulke_kodu_2":"PS"},{"id":74,"title":"Finlandiya","ulke_kodu":"FIN","ulke_kodu_2":"FI"},{"id":75,"title":"Fransa","ulke_kodu":"FRA","ulke_kodu_2":"FR"},{"id":76,"title":"Fransa, Metropolitan","ulke_kodu":"FXX","ulke_kodu_2":"FX"},{"id":77,"title":"Frans\u0131z Guyanas\u0131","ulke_kodu":"GUF","ulke_kodu_2":"GF"},{"id":79,"title":"Frans\u0131z G\u00fcney Topraklar\u0131","ulke_kodu":"ATF","ulke_kodu_2":"TF"},{"id":78,"title":"Frans\u0131z Polinezyas\u0131","ulke_kodu":"PYF","ulke_kodu_2":"PF"},{"id":81,"title":"Gabon","ulke_kodu":"GAB","ulke_kodu_2":"GA"},{"id":82,"title":"Gambiya","ulke_kodu":"GMB","ulke_kodu_2":"GM"},{"id":85,"title":"Gana","ulke_kodu":"GHA","ulke_kodu_2":"GH"},{"id":83,"title":"Georgia","ulke_kodu":"GEO","ulke_kodu_2":"GE"},{"id":95,"title":"Gine","ulke_kodu":"GIN","ulke_kodu_2":"GN"},{"id":96,"title":"Gine-Bissau","ulke_kodu":"GNB","ulke_kodu_2":"GW"},{"id":90,"title":"Grenada","ulke_kodu":"GRD","ulke_kodu_2":"GD"},{"id":89,"title":"Gr\u00f6nland","ulke_kodu":"GRL","ulke_kodu_2":"GL"},{"id":91,"title":"Guadeloupe","ulke_kodu":"GLP","ulke_kodu_2":"GP"},{"id":92,"title":"Guam","ulke_kodu":"GUM","ulke_kodu_2":"GU"},{"id":93,"title":"Guatemala","ulke_kodu":"GTM","ulke_kodu_2":"GT"},{"id":94,"title":"Guernsey","ulke_kodu":"GGY","ulke_kodu_2":"GG"},{"id":97,"title":"Guyana","ulke_kodu":"GUY","ulke_kodu_2":"GY"},{"id":203,"title":"G\u00fcney Afrika","ulke_kodu":"ZAF","ulke_kodu_2":"ZA"},{"id":98,"title":"Haiti","ulke_kodu":"HTI","ulke_kodu_2":"HT"},{"id":99,"title":"Heard ve McDonald Adalar\u0131","ulke_kodu":"HMD","ulke_kodu_2":"HM"},{"id":207,"title":"Helena","ulke_kodu":"SHN","ulke_kodu_2":"SH"},{"id":54,"title":"H\u0131rvatistan (Hrvatska)","ulke_kodu":"HRV","ulke_kodu_2":"HR"},{"id":104,"title":"Hindistan","ulke_kodu":"IND","ulke_kodu_2":"IN"},{"id":156,"title":"Hollanda","ulke_kodu":"NLD","ulke_kodu_2":"NL"},{"id":157,"title":"Hollanda Antilleri","ulke_kodu":"ANT","ulke_kodu_2":"AN"},{"id":100,"title":"Honduras","ulke_kodu":"HND","ulke_kodu_2":"HN"},{"id":101,"title":"Hong Kong","ulke_kodu":"HKG","ulke_kodu_2":"HK"},{"id":107,"title":"Irak","ulke_kodu":"IRQ","ulke_kodu_2":"IQ"},{"id":110,"title":"Isle of Man","ulke_kodu":"IMN","ulke_kodu_2":"IM"},{"id":242,"title":"\u0130ngiliz Virgin Adalar\u0131","ulke_kodu":"VGB","ulke_kodu_2":"VG"},{"id":87,"title":"\u0130ngiltere","ulke_kodu":"GBR","ulke_kodu_2":"GB"},{"id":106,"title":"\u0130ran","ulke_kodu":"IRN","ulke_kodu_2":"IR"},{"id":108,"title":"\u0130rlanda","ulke_kodu":"IRL","ulke_kodu_2":"IE"},{"id":205,"title":"\u0130spanya","ulke_kodu":"ESP","ulke_kodu_2":"ES"},{"id":109,"title":"\u0130srail","ulke_kodu":"ISR","ulke_kodu_2":"IL"},{"id":213,"title":"\u0130sve\u00e7","ulke_kodu":"SWE","ulke_kodu_2":"SE"},{"id":214,"title":"\u0130svi\u00e7re","ulke_kodu":"CHE","ulke_kodu_2":"CH"},{"id":111,"title":"\u0130talya","ulke_kodu":"ITA","ulke_kodu_2":"IT"},{"id":103,"title":"\u0130zlanda","ulke_kodu":"ISL","ulke_kodu_2":"IS"},{"id":113,"title":"Jamaika","ulke_kodu":"JAM","ulke_kodu_2":"JM"},{"id":114,"title":"Japonya","ulke_kodu":"JPN","ulke_kodu_2":"JP"},{"id":112,"title":"Jersey","ulke_kodu":"JEY","ulke_kodu_2":"JE"},{"id":36,"title":"Kambo\u00e7ya","ulke_kodu":"KHM","ulke_kodu_2":"KH"},{"id":37,"title":"Kamerun","ulke_kodu":"CMR","ulke_kodu_2":"CM"},{"id":38,"title":"Kanada","ulke_kodu":"CAN","ulke_kodu_2":"CA"},{"id":148,"title":"Karada\u011f","ulke_kodu":"MNE","ulke_kodu_2":"ME"},{"id":181,"title":"Katar","ulke_kodu":"QAT","ulke_kodu_2":"QA"},{"id":116,"title":"Kazakistan","ulke_kodu":"KAZ","ulke_kodu_2":"KZ"},{"id":117,"title":"Kenya","ulke_kodu":"KEN","ulke_kodu_2":"KE"},{"id":56,"title":"K\u0131br\u0131s","ulke_kodu":"CYP","ulke_kodu_2":"CY"},{"id":122,"title":"K\u0131rg\u0131zistan","ulke_kodu":"KGZ","ulke_kodu_2":"KG"},{"id":118,"title":"Kiribati","ulke_kodu":"KIR","ulke_kodu_2":"KI"},{"id":250,"title":"KKTC","ulke_kodu":"KKTC","ulke_kodu_2":"KKTC"},{"id":47,"title":"Kolombiya","ulke_kodu":"COL","ulke_kodu_2":"CO"},{"id":48,"title":"Komorlar","ulke_kodu":"COM","ulke_kodu_2":"KM"},{"id":49,"title":"Kongo","ulke_kodu":"COG","ulke_kodu_2":"CG"},{"id":50,"title":"Kongo Demokratik Cumhuriyeti","ulke_kodu":"COD","ulke_kodu_2":"CD"},{"id":120,"title":"Kore (G\u00fcney)","ulke_kodu":"KOR","ulke_kodu_2":"KR"},{"id":119,"title":"Kore (Kuzey)","ulke_kodu":"PRK","ulke_kodu_2":"KP"},{"id":52,"title":"Kostarika","ulke_kodu":"CRI","ulke_kodu_2":"CR"},{"id":121,"title":"Kuveyt","ulke_kodu":"KWT","ulke_kodu_2":"KW"},{"id":166,"title":"Kuzey Mariana Adalar\u0131","ulke_kodu":"MNP","ulke_kodu_2":"MP"},{"id":55,"title":"K\u00fcba","ulke_kodu":"CUB","ulke_kodu_2":"CU"},{"id":123,"title":"Laos","ulke_kodu":"LAO","ulke_kodu_2":"LA"},{"id":129,"title":"Lesoto","ulke_kodu":"LSO","ulke_kodu_2":"LS"},{"id":124,"title":"Letonya","ulke_kodu":"LVA","ulke_kodu_2":"LV"},{"id":127,"title":"Liberya","ulke_kodu":"LBR","ulke_kodu_2":"LR"},{"id":128,"title":"Libya","ulke_kodu":"LBY","ulke_kodu_2":"LY"},{"id":126,"title":"Liechtenstein","ulke_kodu":"LIE","ulke_kodu_2":"LI"},{"id":130,"title":"Litvanya","ulke_kodu":"LTU","ulke_kodu_2":"LT"},{"id":125,"title":"L\u00fcbnan","ulke_kodu":"LBN","ulke_kodu_2":"LB"},{"id":131,"title":"L\u00fcksemburg","ulke_kodu":"LUX","ulke_kodu_2":"LU"},{"id":102,"title":"Macaristan","ulke_kodu":"HUN","ulke_kodu_2":"HU"},{"id":133,"title":"Madagaskar","ulke_kodu":"MDG","ulke_kodu_2":"MG"},{"id":132,"title":"Makao","ulke_kodu":"MAC","ulke_kodu_2":"MO"},{"id":134,"title":"Malawi","ulke_kodu":"MWI","ulke_kodu_2":"MW"},{"id":136,"title":"Maldivler","ulke_kodu":"MDV","ulke_kodu_2":"MV"},{"id":135,"title":"Malezya","ulke_kodu":"MYS","ulke_kodu_2":"MY"},{"id":137,"title":"Mali","ulke_kodu":"MLI","ulke_kodu_2":"ML"},{"id":138,"title":"Malta","ulke_kodu":"MLT","ulke_kodu_2":"MT"},{"id":139,"title":"Marshall Adalar\u0131","ulke_kodu":"MHL","ulke_kodu_2":"MH"},{"id":140,"title":"Martinik","ulke_kodu":"MTQ","ulke_kodu_2":"MQ"},{"id":142,"title":"Mauritius","ulke_kodu":"MUS","ulke_kodu_2":"MU"},{"id":143,"title":"Mayotte","ulke_kodu":"MYT","ulke_kodu_2":"YT"},{"id":144,"title":"Meksika","ulke_kodu":"MEX","ulke_kodu_2":"MX"},{"id":65,"title":"M\u0131s\u0131r","ulke_kodu":"EGY","ulke_kodu_2":"EG"},{"id":145,"title":"Mikronezya","ulke_kodu":"FSM","ulke_kodu_2":"FM"},{"id":146,"title":"Moldova","ulke_kodu":"MDA","ulke_kodu_2":"MD"},{"id":147,"title":"Monaco","ulke_kodu":"MCO","ulke_kodu_2":"MC"},{"id":149,"title":"Montserrat","ulke_kodu":"MSR","ulke_kodu_2":"MS"},{"id":141,"title":"Moritanya","ulke_kodu":"MRT","ulke_kodu_2":"MR"},{"id":151,"title":"Mozambik","ulke_kodu":"MOZ","ulke_kodu_2":"MZ"},{"id":152,"title":"Myanmar","ulke_kodu":"MMR","ulke_kodu_2":"MM"},{"id":153,"title":"Namibya","ulke_kodu":"NAM","ulke_kodu_2":"NA"},{"id":154,"title":"Nauru","ulke_kodu":"NRU","ulke_kodu_2":"NR"},{"id":155,"title":"Nepal","ulke_kodu":"NPL","ulke_kodu_2":"NP"},{"id":162,"title":"Nijer","ulke_kodu":"NER","ulke_kodu_2":"NE"},{"id":163,"title":"Nijerya","ulke_kodu":"NGA","ulke_kodu_2":"NG"},{"id":161,"title":"Nikaragua","ulke_kodu":"NIC","ulke_kodu_2":"NI"},{"id":164,"title":"Niue","ulke_kodu":"NIU","ulke_kodu_2":"NU"},{"id":165,"title":"Norfolk Adas\u0131","ulke_kodu":"NFK","ulke_kodu_2":"NF"},{"id":167,"title":"Norve\u00e7","ulke_kodu":"NOR","ulke_kodu_2":"NO"},{"id":41,"title":"Orta Afrika Cumhuriyeti","ulke_kodu":"CAF","ulke_kodu_2":"CF"},{"id":237,"title":"\u00d6zbekistan","ulke_kodu":"UZB","ulke_kodu_2":"UZ"},{"id":169,"title":"Pakistan","ulke_kodu":"PAK","ulke_kodu_2":"PK"},{"id":170,"title":"Palau","ulke_kodu":"PLW","ulke_kodu_2":"PW"},{"id":172,"title":"Panama","ulke_kodu":"PAN","ulke_kodu_2":"PA"},{"id":173,"title":"Papua Yeni Gine","ulke_kodu":"PNG","ulke_kodu_2":"PG"},{"id":174,"title":"Paraguay","ulke_kodu":"PRY","ulke_kodu_2":"PY"},{"id":175,"title":"Peru","ulke_kodu":"PER","ulke_kodu_2":"PE"},{"id":177,"title":"Pitcairn","ulke_kodu":"PCN","ulke_kodu_2":"PN"},{"id":178,"title":"Polonya","ulke_kodu":"POL","ulke_kodu_2":"PL"},{"id":179,"title":"Portekiz","ulke_kodu":"PRT","ulke_kodu_2":"PT"},{"id":180,"title":"Portoriko","ulke_kodu":"PRI","ulke_kodu_2":"PR"},{"id":183,"title":"Romanya","ulke_kodu":"ROU","ulke_kodu_2":"RO"},{"id":185,"title":"Ruanda","ulke_kodu":"RWA","ulke_kodu_2":"RW"},{"id":184,"title":"Rusya Federasyonu","ulke_kodu":"RUS","ulke_kodu_2":"RU"},{"id":186,"title":"S. Georgia ve S. Sandwich Isls.","ulke_kodu":"SGS","ulke_kodu_2":"GS"},{"id":204,"title":"S. Georgia ve S. Sandwich Isls.","ulke_kodu":"SGS","ulke_kodu_2":"GS"},{"id":187,"title":"Saint Kitts ve Nevis","ulke_kodu":"KNA","ulke_kodu_2":"KN"},{"id":188,"title":"Saint Lucia","ulke_kodu":"LCA","ulke_kodu_2":"LC"},{"id":208,"title":"Saint Pierre ve Miquelon","ulke_kodu":"SPM","ulke_kodu_2":"PM"},{"id":189,"title":"Saint Vincent ve Grenadinler","ulke_kodu":"VCT","ulke_kodu_2":"VC"},{"id":190,"title":"Samoa","ulke_kodu":"WSM","ulke_kodu_2":"WS"},{"id":191,"title":"San Marino","ulke_kodu":"SMR","ulke_kodu_2":"SM"},{"id":192,"title":"Sao Tome ve Principe","ulke_kodu":"STP","ulke_kodu_2":"ST"},{"id":194,"title":"Senegal","ulke_kodu":"SEN","ulke_kodu_2":"SN"},{"id":196,"title":"Sey\u015feller","ulke_kodu":"SYC","ulke_kodu_2":"SC"},{"id":195,"title":"S\u0131rbistan","ulke_kodu":"SRB","ulke_kodu_2":"RS"},{"id":197,"title":"Sierra Leone","ulke_kodu":"SLE","ulke_kodu_2":"SL"},{"id":198,"title":"Singapur","ulke_kodu":"SGP","ulke_kodu_2":"SG"},{"id":200,"title":"Slovak Cumhuriyeti","ulke_kodu":"SVK","ulke_kodu_2":"SK"},{"id":199,"title":"Slovenya","ulke_kodu":"SVN","ulke_kodu_2":"SI"},{"id":201,"title":"Solomon Adalar\u0131","ulke_kodu":"SLB","ulke_kodu_2":"SB"},{"id":202,"title":"Somali","ulke_kodu":"SOM","ulke_kodu_2":"SO"},{"id":206,"title":"Sri Lanka","ulke_kodu":"LKA","ulke_kodu_2":"LK"},{"id":236,"title":"SSCB (eski)","ulke_kodu":"SUN","ulke_kodu_2":"SU"},{"id":209,"title":"Sudan","ulke_kodu":"SDN","ulke_kodu_2":"SD"},{"id":210,"title":"Surinam","ulke_kodu":"SUR","ulke_kodu_2":"SR"},{"id":215,"title":"Suriye","ulke_kodu":"SYR","ulke_kodu_2":"SY"},{"id":193,"title":"Suudi Arabistan","ulke_kodu":"SAU","ulke_kodu_2":"SA"},{"id":211,"title":"Svalbard ve Jan Mayen Adalar\u0131","ulke_kodu":"SJM","ulke_kodu_2":"SJ"},{"id":212,"title":"Svaziland","ulke_kodu":"SWZ","ulke_kodu_2":"SZ"},{"id":43,"title":"\u015eili","ulke_kodu":"CHL","ulke_kodu_2":"CL"},{"id":217,"title":"Tacikistan","ulke_kodu":"TJK","ulke_kodu_2":"TJ"},{"id":218,"title":"Tanzanya","ulke_kodu":"TZA","ulke_kodu_2":"TZ"},{"id":158,"title":"Tarafs\u0131z B\u00f6lge","ulke_kodu":"NTZ","ulke_kodu_2":"NT"},{"id":219,"title":"Tayland","ulke_kodu":"THA","ulke_kodu_2":"TH"},{"id":216,"title":"Tayvan","ulke_kodu":"TWN","ulke_kodu_2":"TW"},{"id":220,"title":"Togo","ulke_kodu":"TGO","ulke_kodu_2":"TG"},{"id":221,"title":"Tokelau","ulke_kodu":"TKL","ulke_kodu_2":"TK"},{"id":222,"title":"Tonga","ulke_kodu":"TON","ulke_kodu_2":"TO"},{"id":223,"title":"Trinidad ve Tobago","ulke_kodu":"TTO","ulke_kodu_2":"TT"},{"id":224,"title":"Tunus","ulke_kodu":"TUN","ulke_kodu_2":"TN"},{"id":227,"title":"Turks ve Caicos Adalar\u0131","ulke_kodu":"TCA","ulke_kodu_2":"TC"},{"id":228,"title":"Tuvalu","ulke_kodu":"TUV","ulke_kodu_2":"TV"},{"id":225,"title":"T\u00fcrkiye","ulke_kodu":"TUR","ulke_kodu_2":"TR"},{"id":226,"title":"T\u00fcrkmenistan","ulke_kodu":"TKM","ulke_kodu_2":"TM"},{"id":229,"title":"Uganda","ulke_kodu":"UGA","ulke_kodu_2":"UG"},{"id":230,"title":"Ukrayna","ulke_kodu":"UKR","ulke_kodu_2":"UA"},{"id":168,"title":"Umman","ulke_kodu":"OMN","ulke_kodu_2":"OM"},{"id":235,"title":"Uruguay","ulke_kodu":"URY","ulke_kodu_2":"UY"},{"id":115,"title":"\u00dcrd\u00fcn","ulke_kodu":"JOR","ulke_kodu_2":"JO"},{"id":238,"title":"Vanuatu","ulke_kodu":"VUT","ulke_kodu_2":"VU"},{"id":239,"title":"Vatikan \u015eehir Devleti (Holy See)","ulke_kodu":"VAT","ulke_kodu_2":"VA"},{"id":240,"title":"Venezuela","ulke_kodu":"VEN","ulke_kodu_2":"VE"},{"id":241,"title":"Viet Nam","ulke_kodu":"VNM","ulke_kodu_2":"VN"},{"id":243,"title":"Virgin Adalar\u0131 (ABD)","ulke_kodu":"VIR","ulke_kodu_2":"VI"},{"id":244,"title":"Wallis ve Futuna Adalar\u0131","ulke_kodu":"WLF","ulke_kodu_2":"WF"},{"id":246,"title":"Yemen","ulke_kodu":"YEM","ulke_kodu_2":"YE"},{"id":159,"title":"Yeni Kaledonya","ulke_kodu":"NCL","ulke_kodu_2":"NC"},{"id":160,"title":"Yeni Zelanda (Aotearoa)","ulke_kodu":"NZL","ulke_kodu_2":"NZ"},{"id":247,"title":"Yugoslavya (eski)","ulke_kodu":"YUG","ulke_kodu_2":"YU"},{"id":88,"title":"Yunanistan","ulke_kodu":"GRC","ulke_kodu_2":"GR"},{"id":248,"title":"Zambiya","ulke_kodu":"ZMB","ulke_kodu_2":"ZM"},{"id":249,"title":"Zimbabve","ulke_kodu":"ZWE","ulke_kodu_2":"ZW"}]}
*/

// NOT: ülke kodları yakın gelecekte değişmeyeceğinden dönen dizi lokal olarak kaydedilebilir. 

$array_ulkeler = array();
if ($array_response['durum'] == 'basarili'){
	$array_ulkeler = $array_response['degerler'];
}

exit();

//---------------------------------------------------------------
// 9.0 - ülke listesi - son
//---------------------------------------------------------------
