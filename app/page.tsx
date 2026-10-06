import Image from "next/image"
import Link from "next/link"
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconPackage,
  IconRoute,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react"

import { LanguageSwitch } from "@/components/language-switch"
import { LandingPhonePreview } from "@/components/landing-phone-preview"
import { Button } from "@/components/ui/button"
import { getI18n } from "@/lib/i18n/server"

const metrics = [
  { label: "Order progress", value: "1 view", icon: IconPackage },
  { label: "Payments due", value: "Clear", icon: IconClock },
  { label: "Delivery status", value: "Live", icon: IconRoute },
  { label: "Customer history", value: "Ready", icon: IconUsers },
]

const features = [
  "Capture each customer request with the product, shop, cost, selling price, payment, and delivery status",
  "Keep customers and shops organized so you can find previous orders, prices, contacts, and repeat buyers",
  "See sales, costs, unpaid balances, refunds, and profit instead of guessing from chat messages",
  "Use monthly and customer data to see what sells, which shops perform well, and where your profit comes from",
]

export default async function Home() {
  const { t } = await getI18n()

  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#171512]">
      <header className="border-b border-[#ded6c9] bg-[#fbfaf7]/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt={t("Latli")}
              width={644}
              height={434}
              priority
              className="h-11 w-auto"
            />
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitch />
          <Button asChild className="h-10 rounded-lg px-5 tracking-normal">
            <Link href="/login">{t("Login")}</Link>
          </Button>
          </div>
        </div>
      </header>

      <section className="border-b border-[#ded6c9] bg-[#fbfaf7] px-5">
        <div className="mx-auto grid min-h-[calc(100dvh-73px)] w-full max-w-6xl items-center gap-10 py-12 md:grid-cols-[0.95fr_1.05fr] md:py-16">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#d8c7ad] bg-[#fffaf1] px-3 py-2 text-sm font-medium text-[#6f4b1e]">
              <IconShieldCheck className="size-4" />{t("Order and profit management for shop owners")}</div>

            <h1 className="landing-hero-title font-heading text-5xl font-semibold leading-[1.03] md:text-7xl">{t("Know every order, customer, shop, and profit in one place")}</h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-[#605848]">{t("Turn customer messages into organized orders. Latli helps shop owners track what to buy, who has paid, what is being delivered, and which products and shops make the most profit")}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-lg px-6 text-sm tracking-normal"
              >
                <Link href="/login">{t("Start managing orders")}<IconArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-[#ded6c9] pt-6">
              <Stat value="1" label={t("Place for every order")} />
              <Stat value="360°" label={t("View of your business")} />
              <Stat value="100%" label={t("Profit visibility")} />
            </div>
          </div>

          <LandingPhonePreview />
        </div>
      </section>

      <section className="px-5 py-16 md:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-4 md:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} label={t(metric.label)} />
            ))}
          </div>

          <div className="mt-16 grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <div>
              <p className="text-sm font-semibold uppercase text-[#8a5a20]">{t("Built for shop owners")}</p>
              <h2 className="mt-3 font-heading text-4xl font-semibold leading-tight">{t("Stop managing your business from scattered chats and notebooks")}</h2>
            </div>

            <div className="grid gap-3">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex gap-3 rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-4"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[#184f3b] text-white">
                    <IconCheck className="size-4" />
                  </span>
                  <p className="leading-7 text-[#4d463b]">{t(feature)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#ded6c9] bg-[#fbfaf7] px-5 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-[#605848] sm:flex-row sm:items-center sm:justify-between">
          <p>{t("Developed by Shwan")}</p>
          <nav className="flex items-center gap-4" aria-label={t("Legal")}>
            <Link href="/terms" className="underline-offset-4 hover:underline">
              {t("Terms of Service")}
            </Link>
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              {t("Privacy Policy")}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-heading text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#605848]">{label}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-[#eee7dc]">
          <Icon className="size-5 text-[#5f4d35]" />
        </span>
        <p className="font-heading text-3xl font-semibold">{value}</p>
      </div>
      <p className="mt-4 text-sm font-medium text-[#605848]">{label}</p>
    </div>
  )
}
