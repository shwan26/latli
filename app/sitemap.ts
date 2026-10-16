import type { MetadataRoute } from "next"

import { ARTICLES } from "@/app/blog/articles"
import { SITE_URL } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/pricing", "/about", "/blog", "/contact", "/terms", "/privacy"]

  return [
    ...pages.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...ARTICLES.map((article) => ({
      url: `${SITE_URL}/blog/${article.slug}`,
      lastModified: new Date(article.published),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ]
}
