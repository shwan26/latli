import Link from "next/link"

import { translateTo } from "@/lib/i18n/runtime"

// One block of text is a paragraph. An array of strings is a bullet list.
export type LegalBlock = string | string[]

export type LegalSection = {
  heading: string
  body: LegalBlock[]
}

export function LegalPage({
  title,
  updated,
  intro,
  sections,
  otherPage,
}: {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
  otherPage: { href: string; label: string }
}) {
  // Legal text is English only for now.
  const t = (text: string, vars?: Record<string, string | number>) =>
    translateTo("en", text, vars)

  return (
    <main className="min-h-dvh bg-muted px-5 py-8">
      <article className="mx-auto w-full max-w-2xl space-y-8 rounded-[20px] border bg-background p-6 md:p-8">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("Last updated {date}", { date: updated })}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{intro}</p>
        </header>

        {sections.map((section, index) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="font-heading text-lg font-medium">
              {index + 1}. {section.heading}
            </h2>

            {section.body.map((block, blockIndex) =>
              typeof block === "string" ? (
                <p
                  key={blockIndex}
                  className="text-sm leading-6 text-muted-foreground"
                >
                  {block}
                </p>
              ) : (
                <ul
                  key={blockIndex}
                  className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground"
                >
                  {block.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )
            )}
          </section>
        ))}

        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-sm">
          <Link href={otherPage.href} className="font-medium underline">
            {otherPage.label}
          </Link>
          <Link href="/register" className="font-medium underline">
            {t("Back to registration")}
          </Link>
        </footer>
      </article>
    </main>
  )
}
