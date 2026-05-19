// lib/currency.ts

import type { LocalOrder } from "../lib/local-orders"

export function formatBaht(value: number) {
  return `฿${Math.round(value || 0).toLocaleString("en-US")}`
}

export function formatKyat(value: number) {
  return `MMK ${Math.round(value || 0).toLocaleString("en-US")}`
}

export function getOrderRate(order: LocalOrder) {
  return order.exchangeRateThbToMmk || 1
}

export function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}