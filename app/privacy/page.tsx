import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-muted px-5 py-8">
      <article className="mx-auto w-full max-w-2xl space-y-5 rounded-[20px] border bg-background p-6">
        <header>
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last updated 3 October 2026
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="font-medium">What we collect</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            When you register we collect your email address, password, shop name,
            owner name and age. Gender is optional. We also record when you
            agreed to the Terms of Service and this policy. You can change your
            shop name, owner name, phone, address, age and gender on the Profile
            page.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Where it is stored</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Your account, orders, customers, shops, products and cargo companies
            are stored with Supabase, our authentication, database and file
            storage provider. This includes customer names, phone numbers and
            addresses that you enter. Your passwords are stored as hashes. Only
            you can see your own records.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Photos</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Product photos and order screenshots are stored privately and are
            deleted automatically 7 days after they are saved. Accounts on the
            Pro plan can choose to keep photos for a month, and can extend that
            again later. Deleted photos cannot be recovered.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Reading screenshots</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            For managers on the Pro plan, an order screenshot you upload is sent
            to Google&apos;s Gemini service to read the order details. For
            everyone else, screenshots are read on your device and are not sent
            anywhere.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">Your choices</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            You can edit your profile at any time and ask for your account to be
            deleted. Deleting an account removes its profile.
          </p>
        </section>

        <Link href="/register" className="text-sm font-medium underline">
          Back to registration
        </Link>
      </article>
    </main>
  )
}
