<?php
// Akgünler sefer takvimi HTML proxy
// Cloudflare korumalı sayfayı Turhost üzerinden çeker
// Turhost outbound IP: 94.199.206.76 (Akgünler whitelist'inde)

define('PROXY_SECRET', '8354115b3a1baab1f30d33923b69ca94e1c792ba14598591a69380a8f88ebdcf');

// Secret doğrula
$headers = getallheaders();
$receivedSecret = $headers['X-Proxy-Secret'] ?? $headers['x-proxy-secret'] ?? '';
if ($receivedSecret !== PROXY_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

// Hedef URL
$targetUrl = $_GET['url'] ?? '';
if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode(['error' => 'url parameter required']);
    exit;
}

// Sadece akgunlerbilet.com'a izin ver
$parsed = parse_url($targetUrl);
$host = strtolower($parsed['host'] ?? '');
if ($host !== 'www.akgunlerbilet.com' && $host !== 'akgunlerbilet.com') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden host']);
    exit;
}

// HTML çek
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $targetUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_HTTPHEADER     => [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: tr-TR,tr;q=0.9,en;q=0.8',
        'Referer: https://www.akgunlerbilet.com/',
    ],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_ENCODING       => 'gzip, deflate',
]);

$body   = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error  = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(502);
    echo json_encode(['error' => 'cURL error: ' . $error]);
    exit;
}

http_response_code($status);
header('Content-Type: text/html; charset=utf-8');
header('X-Proxy-By: antsodenizcilik.com');
echo $body;
