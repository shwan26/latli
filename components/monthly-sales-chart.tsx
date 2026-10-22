"use client"

import { useMemo } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/app/lib/currency"
import type { Currency, LocalOrder } from "@/app/lib/local-orders"
import { useI18n } from "@/lib/i18n/provider"
import { dateLocale } from "@/lib/i18n/runtime"

export type ReviewMonth = { year: number; index: number }

type Props = {
  orders: LocalOrder[]
  currency: Currency
  month: ReviewMonth
}

// True when the order was created in the month. Refunded orders are not sales,
// so the monthly review leaves them out.
export function isSoldInMonth(order: LocalOrder, month: ReviewMonth) {
  if (order.paymentStatus === "refunded") return false

  const date = new Date(order.createdAt)

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === month.year &&
    date.getMonth() === month.index
  )
}

function csvCell(value: string | number) {
  const text = String(value)

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function dayKey(year: number, index: number, day: number) {
  return `${year}-${String(index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

// Sales and profit for each day of one month, in the primary currency.
export function MonthlySalesChart({ orders, currency, month }: Props) {
  const { t } = useI18n()

  const { days, total, totalProfit, monthOrders } = useMemo(() => {
    const count = new Date(month.year, month.index + 1, 0).getDate()
    const days = Array.from({ length: count }, (_, i) => ({
      day: i + 1,
      sales: 0,
      profit: 0,
    }))
    const monthOrders: LocalOrder[] = []
    let total = 0
    let totalProfit = 0

    for (const order of orders) {
      if (!isSoldInMonth(order, month)) continue

      const date = new Date(order.createdAt)

      days[date.getDate() - 1].sales += order.totalCustomerPayableThb
      days[date.getDate() - 1].profit += order.profitThb
      total += order.totalCustomerPayableThb
      totalProfit += order.profitThb
      monthOrders.push(order)
    }

    monthOrders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return { days, total, totalProfit, monthOrders }
  }, [orders, month])

  const label = new Date(month.year, month.index, 1).toLocaleDateString(
    dateLocale(),
    { month: "long", year: "numeric" }
  )

  // One file with the month's orders, then the total for each day.
  function handleExport() {
    const rows: (string | number)[][] = [
      ["Order", "Date", "Customer", "Order status", "Payment status", `Amount (${currency})`, `Profit (${currency})`],
      ...monthOrders.map((order) => {
        const date = new Date(order.createdAt)

        return [
          order.orderNumber,
          dayKey(date.getFullYear(), date.getMonth(), date.getDate()),
          order.customerName,
          order.orderStatus,
          order.paymentStatus,
          Math.round(order.totalCustomerPayableThb),
          Math.round(order.profitThb),
        ]
      }),
      [],
      ["Date", `Sales (${currency})`, `Profit (${currency})`],
      ...days.map((entry) => [
        dayKey(month.year, month.index, entry.day),
        Math.round(entry.sales),
        Math.round(entry.profit),
      ]),
      ["Total", Math.round(total), Math.round(totalProfit)],
    ]

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    )
    const link = document.createElement("a")

    link.href = url
    link.download = `sales-${month.year}-${String(month.index + 1).padStart(2, "0")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="rounded-[20px] shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t("Sales & profit")}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <p>
            {t("Sales")}
            <span className="block font-semibold text-foreground">
              {formatMoney(total, currency)}
            </span>
          </p>
          <p>
            {t("Profit")}
            <span className="block font-semibold text-foreground">
              {formatMoney(totalProfit, currency)}
            </span>
          </p>
        </div>
        {total === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("No sales this month")}</p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 rounded-xl"
          onClick={handleExport}
        >
          {t("Export CSV")}
        </Button>

        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              <Tooltip
                formatter={(value, name) => [formatMoney(Number(value), currency), name]}
                labelFormatter={(day) => `${label.split(" ")[0]} ${day}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  fontSize: 12,
                }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="sales"
                name={t("Sales")}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name={t("Profit")}
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
