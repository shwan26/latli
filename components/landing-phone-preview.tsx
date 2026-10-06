"use client"

import { useEffect, useState } from "react"
import {
  IconChartBar,
  IconCheck,
  IconClock,
  IconPackage,
  IconShoppingBag,
  IconShoppingCartOff,
  IconTruckDelivery,
  IconUsers,
} from "@tabler/icons-react"

import { useI18n } from "@/lib/i18n/provider"

const statusCards = [
  { label: "Not bought", value: "12", icon: IconShoppingCartOff },
  { label: "Bought", value: "28", icon: IconPackage },
  { label: "With cargo", value: "16", icon: IconTruckDelivery },
  { label: "Delivered", value: "34", icon: IconPackage },
  { label: "Complete", value: "86", icon: IconCheck },
  { label: "Unpaid", value: "9", icon: IconClock },
]

export function LandingPhonePreview() {
  const { t } = useI18n()
  const [showCreateOrder, setShowCreateOrder] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    if (reduceMotion.matches) return

    const timer = window.setInterval(() => {
      setShowCreateOrder((current) => !current)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-[390px]">
      <div className="absolute inset-x-5 bottom-0 top-5 rounded-[3rem] bg-[#171512]/15 blur-2xl" />
      <div className="relative rounded-[3rem] border-[8px] border-[#171512] bg-[#171512] p-1.5 shadow-2xl shadow-[#3d2c16]/25">
        <div className="overflow-hidden rounded-[2.35rem] bg-[#f5f5f7]">
          <div className="relative flex h-8 items-center justify-center bg-white text-[10px] font-semibold text-[#171512]">
            <span>9:41</span>
            <span className="absolute right-5 flex items-center gap-1 text-[9px]">● ◔ ▰</span>
          </div>

          <div className="relative min-h-[560px]">
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${
                showCreateOrder ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
              aria-hidden={showCreateOrder}
            >
              <DashboardPreview />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${
                showCreateOrder ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!showCreateOrder}
            >
              <CreateOrderPreview />
            </div>
          </div>

          <div className="flex items-end justify-around border-t border-[#e5e5e7] bg-white px-2 pb-3 pt-2 text-[9px] text-[#85858d]">
            <div className="rounded-2xl bg-[#171512] px-3 py-2 text-center text-white">
              <IconChartBar className="mx-auto size-4" />
              <span>{t(showCreateOrder ? "Orders" : "Dashboard")}</span>
            </div>
            <div className="px-2 py-2 text-center"><IconPackage className="mx-auto size-4" /><span>{t("Orders")}</span></div>
            <div className="px-2 py-2 text-center"><IconShoppingBag className="mx-auto size-4" /><span>{t("Shops")}</span></div>
            <div className="px-2 py-2 text-center"><IconUsers className="mx-auto size-4" /><span>{t("Customers")}</span></div>
            <div className="px-2 py-2 text-center"><span className="text-base">•••</span><span className="block">{t("More")}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardPreview() {
  const { t } = useI18n()

  return (
    <div className="h-[560px] overflow-y-auto">
      <div className="border-b border-[#e5e5e7] bg-white px-5 pb-5 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#85858d]">{t("Welcome back")}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{t("Business overview")}</h2>
          </div>
          <span className="flex size-10 items-center justify-center rounded-full bg-[#171512] text-2xl font-light text-white">+</span>
        </div>
      </div>
      <div className="space-y-4 px-4 py-5">
        <h3 className="text-lg font-semibold">{t("Orders")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {statusCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[1.25rem] border border-[#e2e2e5] bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#f1f1f3] text-[#73737b]">
                  <Icon className="size-4" />
                </span>
                <span className="text-xl font-bold">{value}</span>
              </div>
              <p className="mt-3 text-xs font-medium">{t(label)}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[1.25rem] border border-[#e2e2e5] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconShoppingBag className="size-5 text-[#73737b]" />
              <span className="text-sm font-semibold uppercase tracking-wide">{t("Orders to buy")}</span>
            </div>
            <span className="text-xs text-[#85858d]">12</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PreviewMoney label={t("Total sales")} value="MMK 8.4M" />
          <PreviewMoney label={t("Profit")} value="MMK 2.1M" />
        </div>
        <FakeMonthlyChart />
      </div>
    </div>
  )
}

function PreviewMoney({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[#e2e2e5] bg-white p-3.5 shadow-sm">
      <p className="text-[10px] text-[#85858d]">{label}</p>
      <p className="mt-2 text-sm font-bold">{value}</p>
    </div>
  )
}

function FakeMonthlyChart() {
  const { t } = useI18n()
  const points = [18, 31, 24, 42, 35, 54, 47, 68, 58, 77, 65, 88]
  const labels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]

  return (
    <div className="rounded-[1.25rem] border border-[#e2e2e5] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t("Sales and profit")}</span>
        <span className="text-xs text-[#85858d]">2026</span>
      </div>
      <p className="mt-2 text-xs text-[#85858d]">
        {t("This month")}: <strong className="text-[#171512]">MMK 8.4M</strong>
      </p>
      <div className="mt-4 flex h-28 items-end gap-1.5 border-b border-[#e5e5e7] px-1">
        {points.map((height, index) => (
          <div key={labels[index]} className="group flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-[#184f3b] transition-all group-hover:bg-[#9a6a2f]"
              style={{ height: `${height}%` }}
              title={`${labels[index]}: MMK ${height * 100000}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[8px] text-[#85858d]">
        <span>Nov</span>
        <span>Feb</span>
        <span>May</span>
        <span>Aug</span>
        <span>Oct</span>
      </div>
    </div>
  )
}

function CreateOrderPreview() {
  const { t } = useI18n()

  return (
    <div className="h-full bg-[#f5f5f7]">
      <div className="border-b border-[#e5e5e7] bg-white px-5 pb-4 pt-4">
        <p className="text-xs text-[#85858d]">{t("New order")}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{t("Create order")}</h2>
      </div>
      <div className="space-y-3 px-4 py-5">
        <PreviewField label={t("Customer")} value="May Thu" />
        <PreviewField label={t("Shop")} value="Bangkok shop" />
        <PreviewField label={t("Product")} value="Summer dress" />
        <div className="grid grid-cols-2 gap-3">
          <PreviewField label={t("Quantity")} value="2" />
          <PreviewField label={t("Selling price")} value="฿1,200" />
        </div>
        <div className="rounded-[1.25rem] border border-dashed border-[#c9c9ce] bg-white px-4 py-5 text-center">
          <IconShoppingBag className="mx-auto size-6 text-[#73737b]" />
          <p className="mt-2 text-xs text-[#73737b]">{t("Add product photo")}</p>
        </div>
        <div className="rounded-xl bg-[#171512] px-4 py-3 text-center text-sm font-semibold text-white">
          {t("Save order")}
        </div>
      </div>
    </div>
  )
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e2e2e5] bg-white px-3 py-2.5">
      <p className="text-[10px] text-[#85858d]">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
