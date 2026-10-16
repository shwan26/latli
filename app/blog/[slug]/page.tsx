import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PublicFooter } from "@/components/public-footer"
import { PublicNavbar } from "@/components/public-navbar"
import { ARTICLES, getArticle } from "../articles"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug)
  if (!article) return {}

  return {
    title: `${article.title} | Latli`,
    description: article.description,
  }
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).slug)
  if (!article) notFound()

  const others = ARTICLES.filter((item) => item.slug !== article.slug).slice(0, 3)

  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#171512]">
      <PublicNavbar />

      <article className="px-5 py-12 md:py-16">
        <div className="mx-auto w-full max-w-2xl">
          <Link href="/blog" className="text-sm text-[#8a5a20] underline-offset-4 hover:underline">
            ← All guides
          </Link>
          <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-3 text-sm text-[#605848]">
            {article.published} · {article.readMinutes} min read
          </p>
          <p className="mt-6 text-lg leading-8 text-[#4d463b]">{article.description}</p>

          {article.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="font-heading text-2xl font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-4">
                {section.body.map((block, index) =>
                  typeof block === "string" ? (
                    <p key={index} className="leading-8 text-[#4d463b]">
                      {block}
                    </p>
                  ) : (
                    <ul key={index} className="list-disc space-y-2 pl-6 leading-8 text-[#4d463b]">
                      {block.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}

          <div className="mt-12 rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-5">
            <p className="font-heading text-xl font-semibold">Keep your orders in one place</p>
            <p className="mt-2 leading-7 text-[#605848]">
              Latli helps shop owners track orders, payments, delivery and profit. It is free to start.
            </p>
            <Link href="/register" className="mt-3 inline-block font-medium underline underline-offset-4">
              Create a free account
            </Link>
          </div>

          <div className="mt-12 border-t border-[#ded6c9] pt-8">
            <h2 className="font-heading text-xl font-semibold">More guides</h2>
            <ul className="mt-3 space-y-2">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link href={`/blog/${item.slug}`} className="underline underline-offset-4">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </article>

      <PublicFooter />
    </main>
  )
}
