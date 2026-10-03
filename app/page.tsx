import Link from "next/link"
import {
  IconArrowRight,
  IconBrandLine,
  IconChartBar,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconPackage,
  IconReceipt,
  IconRoute,
  IconShieldCheck,
  IconShoppingBag,
  IconTruckDelivery,
  IconUsers,
} from "@tabler/icons-react"

import { LanguageSwitch } from "@/components/language-switch"
import { Button } from "@/components/ui/button"
import { getI18n } from "@/lib/i18n/server"

const workflow = [
  {
    title: "Order captured",
    detail: "Photo, option, size, color, customer note",
    icon: IconReceipt,
  },
  {
    title: "Retailer purchase",
    detail: "Track cost, selling price, and item status",
    icon: IconShoppingBag,
  },
  {
    title: "Payment control",
    detail: "Deposits, unpaid balances, THB and MMK views",
    icon: IconCreditCard,
  },
  {
    title: "Cargo handoff",
    detail: "Cargo company, tracking number, delivery progress",
    icon: IconTruckDelivery,
  },
]

const metrics = [
  { label: "Orders to buy", value: "24", icon: IconPackage },
  { label: "Waiting payment", value: "18", icon: IconClock },
  { label: "In delivery", value: "31", icon: IconRoute },
  { label: "Customers", value: "146", icon: IconUsers },
]

const features = [
  "One place for retailer cost, customer payable, profit, and exchange rate",
  "Mobile-first order entry for Facebook, Line, screenshot, and photo orders",
  "Customer history with repeat buyers and monthly spending summaries",
  "Operational dashboard for buying, payment follow-up, and delivery handoff",
]

export default async function Home() {
  const { t } = await getI18n()

  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#171512]">
      <header className="border-b border-[#ded6c9] bg-[#fbfaf7]/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#171512] text-[#f8f2e8]">
              <IconShoppingBag className="size-5" />
            </span>
            <span className="font-heading text-xl font-semibold">{t("Latli")}</span>
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
              <IconShieldCheck className="size-4" />{t("Retailer process management")}</div>

            <h1 className="font-heading text-5xl font-semibold leading-[1.03] md:text-7xl">{t("Run every retail order from request to delivery.")}</h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-[#605848]">{t("Latli keeps shop owners in control of product buying, customer balances, THB/MMK conversion, cargo handoff, and repeat customer history without spreading work across chat, notes, and sheets.")}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-lg px-6 text-sm tracking-normal"
              >
                <Link href="/login">{t("Login")}<IconArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-[#ded6c9] pt-6">
              <Stat value="4" label={t("Core flows")} />
              <Stat value="2" label={t("Currencies")} />
              <Stat value="1" label={t("Owner view")} />
            </div>
          </div>

          <ProcessPreview />
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
              <p className="text-sm font-semibold uppercase text-[#8a5a20]">{t("Built for daily operations")}</p>
              <h2 className="mt-3 font-heading text-4xl font-semibold leading-tight">{t("A focused back office for retailers who sell through messages.")}</h2>
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
    </main>
  )
}

async function ProcessPreview() {
  const { t } = await getI18n()

  return (
    <div className="relative">
      <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-lg bg-[#171512]" />
      <div className="relative overflow-hidden rounded-lg border border-[#cfc4b4] bg-[#fdfbf7] shadow-2xl shadow-[#3d2c16]/15">
        <div className="flex items-center justify-between border-b border-[#ded6c9] px-5 py-4">
          <div>
            <p className="text-sm text-[#736b5f]">{t("Today")}</p>
            <h2 className="font-heading text-2xl font-semibold">{t("Retail desk")}</h2>
          </div>
          <span className="flex size-11 items-center justify-center rounded-lg bg-[#184f3b] text-white">
            <IconChartBar className="size-5" />
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-3">
            <PreviewTile label={t("Unpaid balance")} value="฿42,800" tone="green" />
            <PreviewTile label={t("Converted total")} value="MMK 4.7M" />
            <PreviewTile label={t("Profit")} value="฿12,450" tone="dark" />
          </div>

          <div className="space-y-3">
            {workflow.map((item, index) => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-lg border border-[#e3dbcf] bg-white p-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eee7dc]">
                    <Icon className="size-5 text-[#5f4d35]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#9a6a2f]">
                        0{index + 1}
                      </span>
                      <h3 className="truncate text-sm font-semibold">
                        {t(item.title)}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#736b5f]">
                      {t(item.detail)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border-t border-[#ded6c9] bg-[#f4efe7] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#5f4d35]">
            <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
              <IconBrandLine className="size-4" />{t("Line retailer")}</span>
            <span className="rounded-lg bg-white px-3 py-2">{t("Facebook order")}</span>
            <span className="rounded-lg bg-white px-3 py-2">{t("Cargo tracking")}</span>
          </div>
        </div>
      </div>
    </div>
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

function PreviewTile({
  label,
  value,
  tone = "light",
}: {
  label: string
  value: string
  tone?: "light" | "green" | "dark"
}) {
  const className =
    tone === "green"
      ? "bg-[#184f3b] text-white"
      : tone === "dark"
        ? "bg-[#171512] text-white"
        : "bg-[#eee7dc] text-[#171512]"

  return (
    <div className={`rounded-lg p-4 ${className}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
    </div>
  )
}
