import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/orders",
          "/customers",
          "/shops",
          "/cargo",
          "/profile",
          "/more",
          "/data",
          "/settings",
          "/reset-password",
        ],
      },
      // The AdSense crawler must be able to read every public page.
      { userAgent: "Mediapartners-Google", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
