// lib/currency.ts

import type { Currency, LocalOrder } from "../lib/local-orders"

const SYMBOLS: Record<Currency, string> = {
  THB: "฿",
  MMK: "MMK ",
  USD: "$",
  SGD: "S$",
  CNY: "CN¥",
  MYR: "RM",
  JPY: "JP¥",
}

export function formatMoney(value: number, currency: Currency) {
  const amount = Math.round(value || 0).toLocaleString("en-US")
  return `${SYMBOLS[currency]}${amount}`
}

export function formatBaht(value: number) {
  return `฿${Math.round(value || 0).toLocaleString("en-US")}`
}

export function formatKyat(value: number) {
  return `MMK ${Math.round(value || 0).toLocaleString("en-US")}`
}

// 1 base currency = this many customer currency.
export function getOrderRate(order: LocalOrder) {
  return order.exchangeRateThbToMmk || 1
}

export function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}