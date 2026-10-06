import type { Metadata } from "next"
import Link from "next/link"
import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react"

import { PublicNavbar } from "@/components/public-navbar"
import { Button } from "@/components/ui/button"
import { getI18n } from "@/lib/i18n/server"
import { supportMailto } from "@/lib/support"

// Edit by hand as founding seats are taken.
const SPOTS_LEFT = 19
const SPOTS_TOTAL = 20

// Burmese visitors see kyat, everyone else sees baht.
const PRICES = {
  en: { free: "฿0", pro: "฿399", offer: "฿99", currency: "Thai baht" },
  my: { free: "၀ ကျပ်", pro: "၅၄,၀၀၀ ကျပ်", offer: "၁၅,၀၀၀ ကျပ်", currency: "Myanmar kyat" },
}

// A row is a check, a cross, or a short text for each plan.
type Cell = boolean | string

const ROWS: { label: string; free: Cell; pro: Cell }[] = [
  { label: "Orders, customers, and shops", free: true, pro: true },
  { label: "Cargo company and tracking number", free: true, pro: true },
  { label: "Payments, deposits, and balances", free: true, pro: true },
  { label: "Sales, cost, and profit dashboard", free: true, pro: true },
  { label: "Order screenshots read on your device", free: true, pro: true },
  { label: "Currencies", free: "1 currency", pro: "2 with exchange rate" },
  { label: "Order screenshots read with Gemini", free: false, pro: "Owners" },
  { label: "Advanced charts", free: false, pro: true },
  { label: "Product photos kept for", free: "7 days", pro: "Up to a month" },
  { label: "Stored photos (5 MB each)", free: "30 photos", pro: "150 photos" },
]

const FAQS = [
  {
    question: "How do I upgrade?",
    answer:
      "Press Get Pro. It opens an email to us with your request. We reply, and switch on your Pro plan after we confirm",
  },
  {
    question: "What is the founding offer?",
    answer:
      "The first 20 shops pay {offer} per month for their first 3 months. After that Pro is {regular} per month",
  },
  {
    question: "Can I cancel Pro?",
    answer:
      "Yes, any time. Contact us and your account goes back to Free. You keep all your orders, customers, and shops",
  },
  {
    question: "Is my customers' information private?",
    answer:
      "Each shop sees only its own orders, customers, and amounts. We do not share or sell your data",
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()

  return {
    title: t("Pricing | Latli"),
    description: t("Start free. Upgrade when your shop grows. No card needed"),
  }
}

export default async function PricingPage() {
  const { t, lang } = await getI18n()
  const price = PRICES[lang]

  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#171512]">
      <PublicNavbar />

      <section className="px-4 py-12 md:py-20">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-center">
            <h1 className="font-heading text-4xl font-semibold leading-tight md:text-6xl">
              {t("Pricing for successful shops")}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-[#605848]">
              {t("Start free. Upgrade when your shop grows. No card needed")}
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-[#ded6c9] bg-[#fbfaf7]">
            <table className="w-full table-fixed border-collapse text-center text-sm md:text-base">
              <colgroup>
                <col className="w-[44%]" />
                <col className="w-[24%]" />
                <col className="w-[32%]" />
              </colgroup>

              <thead>
                <tr>
                  <td />
                  <td />
                  <td className="bg-[#e3efe8] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-[#184f3b]">
                    {t("Limited offer")}
                  </td>
                </tr>
                <tr>
                  <th className="px-3 py-4 text-left text-base font-semibold md:px-5">
                    {t("Plans")}
                  </th>
                  <th className="bg-[#4a4f4c] px-2 py-4 text-base font-semibold text-white md:text-lg">
                    {t("Free plan")}
                  </th>
                  <th className="bg-[#184f3b] px-2 py-4 text-base font-semibold text-white md:text-lg">
                    {t("Pro plan")}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b border-[#ded6c9] bg-[#efebe2]">
                  <th className="px-3 py-4 text-left font-semibold md:px-5">
                    {t("Price per month")}
                  </th>
                  <td className="px-2 py-4">
                    <p className="text-xl font-semibold md:text-2xl">{price.free}</p>
                    <p className="text-xs text-[#605848]">{t("forever")}</p>
                  </td>
                  <td className="bg-[#e3efe8] px-2 py-4">
                    <p className="text-xl font-semibold md:text-2xl">{price.pro}</p>
                  </td>
                </tr>

                <tr className="bg-[#184f3b] text-white">
                  <th className="px-3 py-4 text-left font-semibold md:px-5">
                    {t("Founding offer")}
                  </th>
                  <td className="px-2 py-4">
                    <span aria-hidden>–</span>
                  </td>
                  <td className="bg-[#0f3d2d] px-2 py-4">
                    <p className="text-xl font-semibold md:text-2xl">{price.offer}</p>
                  </td>
                </tr>

                <tr className="border-b border-[#ded6c9] bg-[#f4d58a]">
                  <th className="px-3 py-3 text-left text-sm font-semibold italic md:px-5">
                    {t("First 3 months")}
                  </th>
                  <td className="px-2 py-3">
                    <span aria-hidden>–</span>
                  </td>
                  <td className="bg-[#efca6e] px-2 py-3 text-sm font-semibold italic">
                    {t("{count} of {total} spots left", {
                      count: SPOTS_LEFT,
                      total: SPOTS_TOTAL,
                    })}
                  </td>
                </tr>

                {ROWS.map((row, index) => (
                  <tr
                    key={row.label}
                    className={index % 2 === 0 ? "bg-[#efebe2]" : "bg-[#fbfaf7]"}
                  >
                    <th className="px-3 py-3.5 text-left font-normal leading-snug md:px-5">
                      {t(row.label)}
                    </th>
                    <td className="px-2 py-3.5">{renderCell(row.free, t)}</td>
                    <td className="bg-[#e3efe8]/70 px-2 py-3.5">
                      {renderCell(row.pro, t)}
                    </td>
                  </tr>
                ))}

                <tr className="border-t border-[#ded6c9]">
                  <td className="px-3 py-5 md:px-5" />
                  <td className="px-2 py-5">
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 w-full rounded-lg px-2 text-sm tracking-normal"
                    >
                      <Link href="/register">{t("Get started")}</Link>
                    </Button>
                  </td>
                  <td className="bg-[#e3efe8]/70 px-2 py-5">
                    <Button
                      asChild
                      className="h-11 w-full rounded-lg px-2 text-sm tracking-normal"
                    >
                      <a href={supportMailto("upgrade")}>{t("Get Pro")}</a>
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="mt-16 font-heading text-3xl font-semibold md:text-4xl">
            {t("Questions")}
          </h2>

          <div className="mt-6 grid gap-3">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {t(faq.question)}
                  <IconChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 leading-7 text-[#4d463b]">{t(faq.answer, {
                    offer: price.offer,
                    regular: price.pro,
                  })}</p>
              </details>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-[#605848]">
            {t("Prices in {currency}. Subject to change with notice", {
              currency: t(price.currency),
            })}
          </p>
        </div>
      </section>
    </main>
  )
}

function renderCell(cell: Cell, t: (text: string) => string) {
  if (cell === true) {
    return (
      <IconCheck
        className="mx-auto size-5 text-[#184f3b]"
        aria-label={t("Included")}
      />
    )
  }

  if (cell === false) {
    return (
      <IconX
        className="mx-auto size-5 text-[#605848]"
        aria-label={t("Not included")}
      />
    )
  }

  return <span className="text-sm leading-snug">{t(cell)}</span>
}
