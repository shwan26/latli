import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Photos and sign-in talk to Supabase straight from the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHttps = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWss = supabaseHttps.replace(/^https:/, "wss:");

// Tesseract (screenshot reading on the device) loads its worker, WebAssembly
// core and language data from jsDelivr.
const tesseractCdn = "https://cdn.jsdelivr.net";

const googleAnalytics = [
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
];

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com ${tesseractCdn}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabaseHttps} https://www.googletagmanager.com ${googleAnalytics.join(" ")}`,
  `connect-src 'self' ${supabaseHttps} ${supabaseWss} ${tesseractCdn} https://www.googletagmanager.com ${googleAnalytics.join(" ")}`,
  "worker-src 'self' blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // Report-Only logs problems in the browser console without blocking
  // anything. After clicking through every page with no violations, rename
  // this key to "Content-Security-Policy" to enforce it.
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
