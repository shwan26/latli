// Filters shared by the dashboard cards and the Orders list, so the number on
// a card always equals the rows shown after tapping it.

import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type LocalOrder,
} from "@/app/lib/local-orders"

// The order is not paid or only partly paid. (Refunded orders count as settled.)
export function isUnpaid(order: LocalOrder) {
  return order.paymentStatus === "not_paid" || order.paymentStatus === "partially_paid"
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
