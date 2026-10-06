import { getOrderRate } from "./currency"
import type { Currency } from "./local-orders"
import type { LocalOrder } from "./local-orders"

export type LocalCustomer = {
  id: string
  name: string
  facebookName: string
  phone: string
  address: string
  otherContacts: string
  createdAt: string
  updatedAt?: string
}

export const emptyCustomerDraft = {
  name: "",
  facebookName: "",
  phone: "",
  address: "",
  otherContacts: "",
}

export type CustomerSummary = {
  key: string
  name: string
  facebookName: string
  phone: string
  address: string
  otherContacts: string
  saved: boolean
  orderCount: number
  totalThb: number
  totalMmk: number
  unpaidThb: number
  // Currencies of the customer's latest order. totalThb and unpaidThb are in
  // baseCurrency, totalMmk is in customerCurrency (legacy field names).
  baseCurrency: Currency
  customerCurrency: Currency
  lastOrderAt: string
  createdAt: string
}

// Orders and saved customers are matched by phone, then Facebook name, then
// customer name.
export function getCustomerKey(fields: {
  name?: string
  facebookName?: string
  phone?: string
}) {
  const phone = fields.phone?.trim().toLowerCase()
  const facebook = fields.facebookName?.trim().toLowerCase()
  const name = fields.name?.trim().toLowerCase()

  return phone || facebook || name || ""
}

export function getOrderCustomerKey(order: LocalOrder) {
  return (
    getCustomerKey({
      name: order.customerName,
      facebookName: order.facebookName,
      phone: order.phone,
    }) || order.id
  )
}

// One summary per customer: every saved customer, plus customers that only
// exist on orders.
export function buildCustomerSummaries(
  customers: LocalCustomer[],
  orders: LocalOrder[]
) {
  const summaries = new Map<string, CustomerSummary>()

  for (const customer of customers) {
    const key = getCustomerKey(customer)

    if (!key || summaries.has(key)) continue

    summaries.set(key, {
      key,
      name: customer.name,
      facebookName: customer.facebookName,
      phone: customer.phone,
      address: customer.address,
      otherContacts: customer.otherContacts,
      saved: true,
      orderCount: 0,
      totalThb: 0,
      totalMmk: 0,
      unpaidThb: 0,
      baseCurrency: "THB",
      customerCurrency: "MMK",
      lastOrderAt: "",
      createdAt: customer.createdAt,
    })
  }

  for (const order of orders) {
    const key = getOrderCustomerKey(order)

    const summary =
      summaries.get(key) ??
      ({
        key,
        name: order.customerName || "Customer",
        facebookName: order.facebookName || "",
        phone: order.phone || "",
        address: order.address || "",
        otherContacts: "",
        saved: false,
        orderCount: 0,
        totalThb: 0,
        totalMmk: 0,
        unpaidThb: 0,
        baseCurrency: "THB",
        customerCurrency: "MMK",
        lastOrderAt: "",
        createdAt: order.createdAt,
      } satisfies CustomerSummary)

    const totalThb = order.totalCustomerPayableThb || 0

    summary.orderCount += 1
    summary.totalThb += totalThb
    summary.totalMmk += totalThb * getOrderRate(order)
    summary.unpaidThb += order.remainingBalanceThb || 0
    summary.baseCurrency = order.baseCurrency
    summary.customerCurrency = order.customerCurrency

    if (
      !summary.lastOrderAt ||
      new Date(order.createdAt).getTime() >
        new Date(summary.lastOrderAt).getTime()
    ) {
      summary.lastOrderAt = order.createdAt
    }

    // A customer that only exists on orders was created by its first order.
    if (!summary.saved && order.createdAt < summary.createdAt) {
      summary.createdAt = order.createdAt
    }

    summaries.set(key, summary)
  }

  return Array.from(summaries.values()).sort(
    (a, b) => b.totalThb - a.totalThb || a.name.localeCompare(b.name)
  )
}

// Finds the saved customer an extracted name, Facebook name or phone belongs
// to. A phone match wins over a Facebook match, which wins over a name match.
export function findMatchingCustomer(
  customers: CustomerSummary[],
  fields: { name?: string; facebookName?: string; phone?: string }
) {
  const phone = fields.phone?.trim().toLowerCase()
  const facebook = fields.facebookName?.trim().toLowerCase()
  const name = fields.name?.trim().toLowerCase()

  return (
    (phone && customers.find((c) => c.phone.trim().toLowerCase() === phone)) ||
    (facebook &&
      customers.find((c) => c.facebookName.trim().toLowerCase() === facebook)) ||
    (name && customers.find((c) => c.name.trim().toLowerCase() === name)) ||
    undefined
  )
}
