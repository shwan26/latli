"use client"

import {
  IconAlertTriangle,
  IconBuildingStore,
  IconChartBar,
  IconChevronLeft,
  IconChevronRight,
  IconDatabase,
  IconPackage,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconTrophy,
  IconTruckDelivery,
  IconUser,
  IconUsers,
} from "@tabler/icons-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Static copies of the real app screens, used by the landing page demo.
// Markup and classes follow app/dashboard, app/orders and app/data.
// Sample data only: nothing here talks to Supabase.

type T = (key: string, vars?: Record<string, string | number>) => string

export type PreviewNavKey = "dashboard" | "orders" | "add" | "data" | "settings"

const DAYS = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1
  const sales = Math.round(
    (day % 4 === 0 ? 0 : 900 + ((day * 37) % 11) * 420) * (0.6 + day / 50)
  )

  return { day, sales, profit: Math.round(sales * 0.27) }
})

const TOTAL_SALES = DAYS.reduce((sum, d) => sum + d.sales, 0)
const TOTAL_PROFIT = DAYS.reduce((sum, d) => sum + d.profit, 0)

const baht = (value: number) => `฿${value.toLocaleString("en-US")}`
const compact = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`)

export function PreviewHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <header className="border-b bg-background px-5 py-4">
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <h2 className="font-heading text-2xl font-medium tracking-tight">{title}</h2>
    </header>
  )
}

export function PreviewTodoCard({ t }: { t: T }) {
  return (
    <Card className="rounded-[20px] border-2 border-amber-400 bg-amber-50 shadow-none">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="size-5 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("To do")}
              </p>
              <h3 className="font-heading text-base font-medium">{t("Buy these orders")}</h3>
            </div>
          </div>
          <Badge variant="default">12</Badge>
        </div>
        <ul className="divide-y rounded-2xl border bg-background">
          {[
            ["Bangkok shop", 7],
            ["Pratunam market", 4],
            ["Siam Center", 1],
          ].map(([label, count]) => (
            <li key={label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate font-medium">{t(String(label))}</span>
              <span className="shrink-0 text-muted-foreground">
                {t(count === 1 ? "{count} order" : "{count} orders", { count })}
              </span>
            </li>
          ))}
        </ul>
        <Button className="h-11 w-full rounded-xl">{t("View orders to buy")}</Button>
      </CardContent>
    </Card>
  )
}

export function PreviewMonthSwitcher({ t }: { t: T }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background">
        <IconChevronLeft className="size-5" />
      </span>
      <h3 className="min-w-0 flex-1 text-center font-heading text-lg font-medium">{t("October 2026")}</h3>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background opacity-50">
        <IconChevronRight className="size-5" />
      </span>
    </div>
  )
}

export function PreviewTopCards({ t }: { t: T }) {
  const cards = [
    { title: t("Top customer"), icon: IconUser, name: t("May Thu"), detail: `฿18,400 · ${t("{count} orders", { count: 6 })}` },
    { title: t("Top product"), icon: IconPackage, name: t("Summer dress"), detail: `${t("{count} sold", { count: 14 })} · ฿16,800` },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ title, icon: Icon, name, detail }) => (
        <div key={title} className="h-full rounded-[20px] border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{title}</span>
            <IconTrophy className="ml-auto size-4 shrink-0 text-amber-500" />
          </div>
          <p className="mt-2 break-words text-base font-semibold">{name}</p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{detail}</p>
        </div>
      ))}
    </div>
  )
}

// Same chart as components/monthly-sales-chart.tsx, fed with sample days.
export function PreviewSalesChart({ t }: { t: T }) {
  return (
    <Card className="rounded-[20px] shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t("Sales & profit")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <p>
            {t("Sales")}
            <span className="block font-semibold text-foreground">{baht(TOTAL_SALES)}</span>
          </p>
          <p>
            {t("Profit")}
            <span className="block font-semibold text-foreground">{baht(TOTAL_PROFIT)}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="mt-3 rounded-xl">
          {t("Export CSV")}
        </Button>
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DAYS} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={12}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tickFormatter={compact}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="sales" name={t("Sales")} stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="profit" name={t("Profit")} stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function PreviewDashboard({ t, wide = false }: { t: T; wide?: boolean }) {
  const left = (
    <>
      <PreviewTodoCard t={t} />
      <PreviewMonthSwitcher t={t} />
      <PreviewTopCards t={t} />
    </>
  )

  return (
    <>
      <PreviewHeader subtitle={t("Welcome back")} title={t("Monthly review")} />
      {wide ? (
        <div className="grid grid-cols-2 items-start gap-4 px-5 py-5">
          <div className="space-y-5">{left}</div>
          <PreviewSalesChart t={t} />
        </div>
      ) : (
        <div className="space-y-5 px-5 py-5">
          {left}
          <PreviewSalesChart t={t} />
        </div>
      )}
    </>
  )
}

const ORDERS = [
  { no: "#1042", day: 22, customer: "May Thu", shop: "Bangkok shop", price: 2400, status: "Bought", variant: "secondary" },
  { no: "#1041", day: 22, customer: "Su Su", shop: "Pratunam market", price: 1650, status: "With cargo", variant: "secondary" },
  { no: "#1040", day: 21, customer: "Hnin", shop: "Siam Center", price: 3200, status: "Not bought", variant: "outline" },
  { no: "#1039", day: 20, customer: "Aye Aye", shop: "Bangkok shop", price: 2100, status: "Delivered", variant: "secondary" },
  { no: "#1038", day: 19, customer: "Thandar", shop: "Pratunam market", price: 980, status: "Complete", variant: "default" },
  { no: "#1037", day: 18, customer: "Moe Moe", shop: "Bangkok shop", price: 4300, status: "Not bought", variant: "outline" },
  { no: "#1036", day: 17, customer: "Khin", shop: "Siam Center", price: 1500, status: "Delivered", variant: "secondary" },
] as const

export function PreviewOrders({ t }: { t: T }) {
  return (
    <>
      <PreviewHeader subtitle={t("{count} orders", { count: ORDERS.length })} title={t("Orders")} />
      <div className="space-y-4 px-5 py-5">
        <div className="relative flex h-12 items-center rounded-xl border bg-background pl-10 text-sm text-muted-foreground">
          <IconSearch className="absolute left-3 size-5" />
          {t("Search")}
        </div>
        <Card className="overflow-hidden rounded-[20px] shadow-none">
          <ul className="divide-y">
            {ORDERS.map((order) => (
              <li key={order.no} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {order.no} · {t("{day} Oct", { day: order.day })}
                    </p>
                    <p className="mt-1 truncate font-medium">{t(order.customer)}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{t(order.shop)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{baht(order.price)}</p>
                    <Badge variant={order.variant} className="mt-1.5">
                      {t(order.status)}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}

export function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

export function PreviewCreateOrder({ t }: { t: T }) {
  return (
    <>
      <PreviewHeader subtitle={t("New order")} title={t("Create order")} />
      <div className="space-y-3 px-5 py-5">
        <div className="rounded-[20px] border border-dashed bg-background px-4 py-6 text-center">
          <IconShoppingBag className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-1 text-xs text-muted-foreground">{t("Add product photo")}</p>
        </div>
        <PreviewField label={t("Customer")} value={t("May Thu")} />
        <PreviewField label={t("Shop")} value={t("Bangkok shop")} />
        <PreviewField label={t("Product")} value={t("Summer dress")} />
        <div className="grid grid-cols-2 gap-3">
          <PreviewField label={t("Quantity")} value="2" />
          <PreviewField label={t("Selling price")} value="฿1,200" />
        </div>
        <div className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">
          {t("Save order")}
        </div>
      </div>
    </>
  )
}

export function PreviewData({ t }: { t: T }) {
  const rows = [
    { icon: IconBuildingStore, title: t("Shops"), count: 6 },
    { icon: IconUsers, title: t("Customers"), count: 48 },
    { icon: IconTruckDelivery, title: t("Cargo"), count: 3 },
  ]

  return (
    <>
      <PreviewHeader subtitle={t("Your shop")} title={t("Data")} />
      <div className="space-y-3 px-5 py-5">
        {rows.map(({ icon: Icon, title, count }) => (
          <div key={title} className="flex min-h-16 items-center gap-3 rounded-2xl border bg-background px-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="size-5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-medium">{title}</p>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{count}</span>
            <IconChevronRight className="size-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </>
  )
}

// Same layout as components/bottom-navigation.tsx.
export function PreviewBottomNav({ active, t }: { active: PreviewNavKey; t: T }) {
  const item = (on: boolean) =>
    `flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors duration-500 ${
      on ? "bg-primary text-primary-foreground" : "text-muted-foreground"
    }`

  return (
    <div className="relative z-10 grid grid-cols-5 items-end gap-1 border-t bg-background px-3 pb-3 pt-2">
      <div className={item(active === "dashboard")}>
        <IconChartBar className="size-5" />
        <span className="text-[10px] leading-none">{t("Dashboard")}</span>
      </div>
      <div className={item(active === "orders")}>
        <IconPackage className="size-5" />
        <span className="text-[10px] leading-none">{t("Orders")}</span>
      </div>
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <span className="-mt-7 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
          <IconPlus className="size-7" />
        </span>
        <span className="text-[10px] leading-none">{t("Add order")}</span>
      </div>
      <div className={item(active === "data")}>
        <IconDatabase className="size-5" />
        <span className="text-[10px] leading-none">{t("Data")}</span>
      </div>
      <div className={item(active === "settings")}>
        <IconSettings className="size-5" />
        <span className="text-[10px] leading-none">{t("Settings")}</span>
      </div>
    </div>
  )
}
