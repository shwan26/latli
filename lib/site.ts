// The public address of the site, used by robots.txt and the sitemap.
// Set NEXT_PUBLIC_SITE_URL (for example https://latli.example.com) in production.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "")
