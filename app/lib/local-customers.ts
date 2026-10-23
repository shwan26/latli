import { isUnpaid } from "@/lib/order-filters"

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
  orderCount: number
  total: number // plain amount in the primary currency
  unpaid: number // number of orders not fully paid
  lastOrderAt: string
  createdAt: string
}

// Two saved customers count as the same person when they share a phone, else
// a Facebook name, else a name. Used to stop duplicates and to match what the
// AI read from a screenshot.
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

// One summary per saved customer. The key is the customer's id, which is also
// what orders store (order.customerId).
export function buildCustomerSummaries(
  customers: LocalCustomer[],
  orders: LocalOrder[]
) {
  const summaries = new Map<string, CustomerSummary>()

  for (const customer of customers) {
    summaries.set(customer.id, {
      key: customer.id,
      name: customer.name,
      facebookName: customer.facebookName,
      phone: customer.phone,
      address: customer.address,
      otherContacts: customer.otherContacts,
      orderCount: 0,
      total: 0,
      unpaid: 0,
      lastOrderAt: "",
      createdAt: customer.createdAt,
    })
  }

  for (const order of orders) {
    const summary = order.customerId ? summaries.get(order.customerId) : undefined

    if (!summary) continue

    summary.orderCount += 1
    summary.total += order.totalSellingPrice || 0
    if (isUnpaid(order)) summary.unpaid += 1

    if (
      !summary.lastOrderAt ||
      new Date(order.createdAt).getTime() >
        new Date(summary.lastOrderAt).getTime()
    ) {
      summary.lastOrderAt = order.createdAt
    }
  }

  return Array.from(summaries.values()).sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name)
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
