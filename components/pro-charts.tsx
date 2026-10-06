"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatMoney } from "@/app/lib/currency"
import type { Currency, LocalOrder } from "@/app/lib/local-orders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/provider"

type ChartKey =
  | "sales-profit"
  | "customers"
  | "shops"
  | "products-months"
  | "complete-products"
  | "not-delivered"
  | "refunds"

type Props = { orders: LocalOrder[]; currency: Currency }
type NamedValue = { name: string; value: number }

const CHART_KEYS: ChartKey[] = [
  "sales-profit",
  "customers",
  "shops",
  "products-months",
  "complete-products",
  "not-delivered",
  "refunds",
]

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function aggregate(
  orders: LocalOrder[],
  keyOf: (order: LocalOrder) => string,
  valueOf: (order: LocalOrder) => number
): NamedValue[] {
  const values = new Map<string, number>()

  for (const order of orders) {
    const key = keyOf(order).trim() || "Unknown"
    values.set(key, (values.get(key) ?? 0) + valueOf(order))
  }

  return [...values.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}

function ChartFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-[20px] shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">{children}</div>
      </CardContent>
    </Card>
  )
}

export function ProCharts({ orders, currency }: Props) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<ChartKey>("sales-profit")
  const activeOrders = useMemo(
    () => orders.filter((order) => order.paymentStatus !== "refunded"),
    [orders]
  )

  const labels: Record<ChartKey, string> = {
    "sales-profit": t("Sales vs profit"),
    customers: t("Each customer"),
    shops: t("Each shop"),
    "products-months": t("Products by month"),
    "complete-products": t("Complete products"),
    "not-delivered": t("Not delivered"),
    refunds: t("Refunds"),
  }

  const salesProfit = useMemo(() => {
    const values = new Map<string, { name: string; sales: number; profit: number; sort: number }>()

    for (const order of activeOrders) {
      const date = new Date(order.createdAt)
      if (Number.isNaN(date.getTime())) continue
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const current = values.get(key) ?? {
        name: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        sales: 0,
        profit: 0,
        sort: date.getTime(),
      }
      current.sales += order.totalCustomerPayableThb
      current.profit += order.profitThb
      values.set(key, current)
    }

    return [...values.values()].sort((a, b) => a.sort - b.sort).slice(-12)
  }, [activeOrders])

  const customers = useMemo(
    () => aggregate(activeOrders, (order) => order.customerName, (order) => order.totalCustomerPayableThb),
    [activeOrders]
  )
  const shops = useMemo(
    () => aggregate(activeOrders, (order) => order.retailerName ?? "", (order) => order.totalCustomerPayableThb),
    [activeOrders]
  )
  const completeProducts = useMemo(
    () =>
      aggregate(
        activeOrders.filter((order) => order.orderStatus === "complete"),
        (order) => order.productName ?? "",
        (order) => order.quantity ?? 1
      ),
    [activeOrders]
  )
  const notDelivered = useMemo(
    () =>
      aggregate(
        activeOrders.filter(
          (order) => !["delivered", "complete"].includes(order.orderStatus)
        ),
        (order) => order.productName ?? "",
        (order) => order.quantity ?? 1
      ),
    [activeOrders]
  )
  const refunds = useMemo(
    () =>
      aggregate(
        orders.filter((order) => order.paymentStatus === "refunded"),
        (order) => order.productName ?? "",
        (order) => order.totalPaidThb
      ),
    [orders]
  )

  const productMonths = useMemo(() => {
    const totals = aggregate(
      activeOrders,
      (order) => order.productName ?? "",
      (order) => order.quantity ?? 1
    )
    const products = totals.slice(0, 5).map((entry) => entry.name)
    const values = new Map<string, Record<string, string | number>>()

    for (const order of activeOrders) {
      const date = new Date(order.createdAt)
      const product = order.productName?.trim() || "Unknown"
      if (Number.isNaN(date.getTime()) || !products.includes(product)) continue
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const current = values.get(key) ?? {
        name: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        sort: date.getTime(),
      }
      current[product] = Number(current[product] ?? 0) + (order.quantity ?? 1)
      values.set(key, current)
    }

    return {
      products,
      rows: [...values.values()]
        .sort((a, b) => Number(a.sort) - Number(b.sort))
        .slice(-12),
    }
  }, [activeOrders])

  const barData =
    selected === "customers"
      ? customers
      : selected === "shops"
        ? shops
        : selected === "complete-products"
          ? completeProducts
          : selected === "not-delivered"
            ? notDelivered
            : refunds

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {CHART_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            className={
              selected === key
                ? "rounded-xl bg-primary px-3 py-2 text-left text-sm font-medium text-primary-foreground"
                : "rounded-xl border bg-background px-3 py-2 text-left text-sm font-medium"
            }
          >
            {labels[key]}
          </button>
        ))}
      </div>

      {selected === "sales-profit" ? (
        <ChartFrame title={labels[selected]}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesProfit}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={44} />
              <Tooltip formatter={(value, name) => [formatMoney(Number(value), currency), name]} />
              <Legend />
              <Line dataKey="sales" name={t("Sales")} stroke="var(--primary)" strokeWidth={2} />
              <Line dataKey="profit" name={t("Profit")} stroke="var(--chart-2)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      ) : selected === "products-months" ? (
        <ChartFrame title={labels[selected]}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productMonths.rows}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <Tooltip />
              <Legend />
              {productMonths.products.map((product, index) => (
                <Bar
                  key={product}
                  dataKey={product}
                  stackId="products"
                  fill={index % 2 === 0 ? "var(--primary)" : "var(--chart-2)"}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      ) : (
        <ChartFrame title={labels[selected]}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 12, right: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tickFormatter={selected === "refunds" ? compact : undefined} />
              <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) =>
                  selected === "customers" || selected === "shops" || selected === "refunds"
                    ? formatMoney(Number(value), currency)
                    : Number(value).toLocaleString()
                }
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
    </div>
  )
}
