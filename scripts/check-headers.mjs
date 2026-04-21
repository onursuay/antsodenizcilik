#!/usr/bin/env node
/**
 * Canlı ortamda güvenlik header'larını doğrular.
 * Kullanım: node scripts/check-headers.mjs https://bilet.antsodenizcilik.com
 */

const url = process.argv[2] ?? "https://bilet.antsodenizcilik.com";

const REQUIRED_HEADERS = [
  {
    name: "strict-transport-security",
    check: (v) => v.includes("max-age="),
    desc: "HSTS — HTTPS zorunluluğu",
  },
  {
    name: "x-frame-options",
    check: (v) => v.toUpperCase() === "DENY",
    desc: "X-Frame-Options: DENY — clickjacking koruması",
  },
  {
    name: "x-content-type-options",
    check: (v) => v === "nosniff",
    desc: "X-Content-Type-Options: nosniff",
  },
  {
    name: "referrer-policy",
    check: (v) => v.includes("origin"),
    desc: "Referrer-Policy",
  },
  {
    name: "content-security-policy",
    check: (v) => v.includes("frame-ancestors") && v.includes("form-action"),
    desc: "CSP — frame-ancestors ve form-action içermeli",
  },
  {
    name: "content-security-policy",
    check: (v) => !v.includes("unsafe-eval"),
    desc: "CSP — production'da unsafe-eval olmamalı",
  },
  {
    name: "permissions-policy",
    check: (v) => v.includes("camera=()"),
    desc: "Permissions-Policy",
  },
];

console.log(`\nHeader kontrolü: ${url}\n`);

const res = await fetch(url, { method: "HEAD", redirect: "follow" });
const headers = res.headers;

let passed = 0;
let failed = 0;

for (const rule of REQUIRED_HEADERS) {
  const value = headers.get(rule.name) ?? "";
  const ok = value && rule.check(value);
  const icon = ok ? "✓" : "✗";
  if (ok) passed++; else failed++;
  console.log(`${icon}  ${rule.desc}`);
  if (!ok) console.log(`   Mevcut değer: ${value || "(yok)"}`);
}

console.log(`\n${passed} geçti, ${failed} başarısız.\n`);
if (failed > 0) process.exit(1);
