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

// A price with no currency label. Orders, customers and shops show plain
// numbers; only the dashboard sales and profit parts show the currency.
export function formatAmount(value: number) {
  return Math.round(value || 0).toLocaleString("en-US")
}

// Profit is never stored: what the customer pays minus what the shop charges.
export function getProfit(order: LocalOrder) {
  return order.totalSellingPrice - order.totalRetailerPrice
}

export function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}