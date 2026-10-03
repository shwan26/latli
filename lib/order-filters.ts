// Filters shared by the dashboard cards and the Orders list, so the number on
// a card always equals the rows shown after tapping it.

import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type LocalOrder,
} from "@/app/lib/local-orders"

// A balance is left and the order is not settled or refunded.
export function isUnpaid(order: LocalOrder) {
  return (
    order.remainingBalanceThb > 0 &&
    order.paymentStatus !== "fully_paid" &&
    order.paymentStatus !== "refunded"
  )
}

// Reads a filter from the URL. Anything unknown means "all".
export function parseStatusFilter(value: string | null) {
  return value && (ORDER_STATUSES as string[]).includes(value) ? value : "all"
}

export function parsePaymentFilter(value: string | null) {
  return value &&
    (value === "unpaid" || (PAYMENT_STATUSES as string[]).includes(value))
    ? value
    : "all"
}
