import type { Metadata } from "next"
import Link from "next/link"

import { PublicFooter } from "@/components/public-footer"
import { PublicNavbar } from "@/components/public-navbar"
import { LEGAL } from "@/app/lib/legal"

export const metadata: Metadata = {
  title: "Contact | Latli",
  description: "How to reach the Latli team for support, questions about your data, or a Pro plan upgrade.",
}

// English only, like the other content pages.
export default function ContactPage() {
  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#171512]">
      <PublicNavbar />

      <section className="px-5 py-12 md:py-16">
        <div className="mx-auto w-full max-w-2xl space-y-6 leading-8 text-[#4d463b]">
          <h1 className="font-heading text-4xl font-semibold leading-tight text-[#171512] md:text-5xl">
            Contact us
          </h1>
          <p>
            We read every message. Write to us for help with your account,
            questions about your data, feedback, or to upgrade to Pro.
          </p>

          <div className="rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-5">
            <p className="text-sm text-[#605848]">Email</p>
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="font-heading text-xl font-semibold underline underline-offset-4"
            >
              {LEGAL.contactEmail}
            </a>
            <p className="mt-3 text-sm text-[#605848]">We usually reply within two working days.</p>
          </div>

          <h2 className="font-heading text-2xl font-semibold text-[#171512]">When you write</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use the email address of your Latli account, so we can find it.</li>
            <li>Tell us what you expected and the steps that led to the problem.</li>
            <li>Never send your password. We will never ask for it.</li>
          </ul>

          <p>
            See <Link href="/pricing" className="underline underline-offset-4">Pricing</Link> for the Free and Pro
            plans, or read our <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>{" "}
            and <Link href="/terms" className="underline underline-offset-4">Terms of Service</Link>.
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
