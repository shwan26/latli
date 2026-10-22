// The public address of the site, used by robots.txt and the sitemap.
// Set NEXT_PUBLIC_SITE_URL (for example https://latli.example.com) in production.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "")

// The Facebook Page visitors can message (its username or numeric ID, for
// example "latli.app"). Set NEXT_PUBLIC_FACEBOOK_PAGE; with none set, the
// Messenger button is not shown.
const FACEBOOK_PAGE = (process.env.NEXT_PUBLIC_FACEBOOK_PAGE ?? "").trim()

export const MESSENGER_URL = FACEBOOK_PAGE
  ? `https://m.me/${encodeURIComponent(FACEBOOK_PAGE)}`
  : ""
