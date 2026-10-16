import type { Metadata } from "next"
import Link from "next/link"

import { PublicFooter } from "@/components/public-footer"
import { PublicNavbar } from "@/components/public-navbar"
import { ARTICLES } from "./articles"

export const metadata: Metadata = {
  title: "Blog | Latli",
  description:
    "Practical guides for small online shop owners: order tracking, profit, deposits, cargo and customer records.",
}

// Public guides, English only.
export default function BlogPage() {
  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#171512]">
      <PublicNavbar />

      <section className="px-5 py-12 md:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="font-heading text-4xl font-semibold leading-tight md:text-5xl">
            Guides for shop owners
          </h1>
          <p className="mt-4 text-lg leading-8 text-[#605848]">
            Practical advice on tracking orders, calculating profit, collecting
            payments and running delivery for small online shops.
          </p>

          <div className="mt-10 grid gap-4">
            {ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="block rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-5 transition-colors hover:bg-white"
              >
                <p className="text-xs text-[#8a5a20]">
                  {article.published} · {article.readMinutes} min read
                </p>
                <h2 className="mt-2 font-heading text-2xl font-semibold leading-snug">
                  {article.title}
                </h2>
                <p className="mt-2 leading-7 text-[#605848]">
                  {article.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
