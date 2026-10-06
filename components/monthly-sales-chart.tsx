"use client"

import { useMemo, useState } from "react"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import {
  CartesianGrid,
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

type Props = {
  orders: LocalOrder[]
  currency: Currency
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

// Sales for each day of one month, in the primary currency. Refunded orders
// are not sales.
export function MonthlySalesChart({ orders, currency }: Props) {
  const { t } = useI18n()

  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), index: now.getMonth() }
  })

  const now = new Date()
  const isCurrentMonth =
    month.year === now.getFullYear() && month.index === now.getMonth()

  const { days, total, monthOrders } = useMemo(() => {
    const count = new Date(month.year, month.index + 1, 0).getDate()
    const days = Array.from({ length: count }, (_, i) => ({ day: i + 1, sales: 0 }))
    const monthOrders: LocalOrder[] = []
    let total = 0

    for (const order of orders) {
      if (order.paymentStatus === "refunded") continue

      const date = new Date(order.createdAt)

      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== month.year ||
        date.getMonth() !== month.index
      ) {
        continue
      }

      days[date.getDate() - 1].sales += order.totalCustomerPayableThb
      total += order.totalCustomerPayableThb
      monthOrders.push(order)
    }

    monthOrders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return { days, total, monthOrders }
  }, [orders, month])

  const label = new Date(month.year, month.index, 1).toLocaleDateString(
    dateLocale(),
    { month: "long", year: "numeric" }
  )

  function shift(by: number) {
    setMonth((current) => {
      const next = new Date(current.year, current.index + by, 1)
      return { year: next.getFullYear(), index: next.getMonth() }
    })
  }

  // One file with the month's orders, then the total for each day.
  function handleExport() {
    const rows: (string | number)[][] = [
      ["Order", "Date", "Customer", "Order status", "Payment status", `Amount (${currency})`],
      ...monthOrders.map((order) => {
        const date = new Date(order.createdAt)

        return [
          order.orderNumber,
          dayKey(date.getFullYear(), date.getMonth(), date.getDate()),
          order.customerName,
          order.orderStatus,
          order.paymentStatus,
          Math.round(order.totalCustomerPayableThb),
        ]
      }),
      [],
      ["Date", `Sales (${currency})`],
      ...days.map((entry) => [
        dayKey(month.year, month.index, entry.day),
        Math.round(entry.sales),
      ]),
      ["Total", Math.round(total)],
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
        <CardTitle className="text-base font-medium">{t("Monthly sales")}</CardTitle>
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={() => shift(-1)}
            aria-label={t("Previous month")}
          >
            <IconChevronLeft className="size-5" />
          </Button>
          <span className="min-w-0 flex-1 text-center text-sm font-medium">{label}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            disabled={isCurrentMonth}
            onClick={() => shift(1)}
            aria-label={t("Next month")}
          >
            <IconChevronRight className="size-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          {t("Month total")}:{" "}
          <span className="font-semibold text-foreground">
            {formatMoney(total, currency)}
          </span>
          {total === 0 ? ` · ${t("No sales this month")}` : ""}
        </p>

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
                formatter={(value) => [formatMoney(Number(value), currency), t("Sales")]}
                labelFormatter={(day) => `${label.split(" ")[0]} ${day}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="var(--primary)"
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
