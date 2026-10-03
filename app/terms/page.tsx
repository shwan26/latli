import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-muted px-5 py-8">
      <article className="mx-auto w-full max-w-2xl space-y-5 rounded-[20px] border bg-background p-6">
        <header>
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last updated 3 October 2026
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="font-medium">Using Latli</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Latli helps shop owners and their staff manage customer orders,
            shops, payments and deliveries. You must be at least 13 years old to
            create an account. You are responsible for the information you enter
            and for keeping your password private.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Your data</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Your orders, customers, shops and cargo companies are stored in your
            account. Photos you upload are deleted automatically 7 days after
            they are saved, unless you are on the Pro plan and choose to keep
            them for a month. Deleted photos cannot be recovered, so keep your
            own copies of anything important.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Acceptable use</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Do not use Latli to break the law, to store information you have no
            right to hold, or to attempt to access another person&apos;s account.
            We may suspend accounts that do.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Changes</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            We may update these terms. Continuing to use Latli after a change
            means you accept the updated terms.
          </p>
        </section>

        <Link href="/register" className="text-sm font-medium underline">
          Back to registration
        </Link>
      </article>
    </main>
  )
}
