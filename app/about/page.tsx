import type { Metadata } from "next"
import Link from "next/link"

import { PublicFooter } from "@/components/public-footer"
import { PublicNavbar } from "@/components/public-navbar"

export const metadata: Metadata = {
  title: "About | Latli",
  description:
    "Latli is an order and profit tracker built for small online shop owners who take orders in chat apps.",
}

// English only, like the other content pages.
export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#171512]">
      <PublicNavbar />

      <section className="px-5 py-12 md:py-16">
        <div className="mx-auto w-full max-w-2xl space-y-6 leading-8 text-[#4d463b]">
          <h1 className="font-heading text-4xl font-semibold leading-tight text-[#171512] md:text-5xl">
            About Latli
          </h1>
          <p>
            Latli is a web app for small online shop owners who take orders
            through chat apps such as Facebook Messenger, LINE and Viber, buy
            the products from other shops, and deliver them to customers
            through cargo companies.
          </p>
          <p>
            Running a shop this way means juggling many things at once: what each
            customer ordered, what to buy and from where, who has paid a
            deposit, which parcels are on their way, and how much profit is left
            after costs and shipping. Most owners keep all of this in chat
            threads, notebooks and spreadsheets. Orders get lost, money gets
            forgotten, and nobody knows which products actually earn.
          </p>

          <h2 className="font-heading text-2xl font-semibold text-[#171512]">What Latli does</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Keeps every order together with its product, shop, cost, selling price and notes.</li>
            <li>Tracks payments, deposits, unpaid balances and refunds.</li>
            <li>Follows delivery from not bought, to bought, sent to cargo and delivered, with the cargo company and tracking number.</li>
            <li>Stores customers and shops so repeat orders are quick to enter.</li>
            <li>Shows sales, costs and profit on a dashboard, with monthly charts.</li>
            <li>Can read order details from a chat screenshot, either on your own device or with Gemini on the Pro plan.</li>
          </ul>

          <h2 className="font-heading text-2xl font-semibold text-[#171512]">Who makes it</h2>
          <p>
            Latli is developed and maintained by Shwan, an independent
            developer. It is built around how small shops really work, and
            features are added from the feedback of the shop owners who use it.
          </p>

          <h2 className="font-heading text-2xl font-semibold text-[#171512]">Your data</h2>
          <p>
            Each shop sees only its own orders, customers and amounts. We do not
            sell your data. Read the{" "}
            <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>{" "}
            for the details, or{" "}
            <Link href="/contact" className="underline underline-offset-4">contact us</Link>{" "}
            with any question.
          </p>

          <p>
            Want to learn more about running a small online shop? Read our{" "}
            <Link href="/blog" className="underline underline-offset-4">guides</Link>.
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
