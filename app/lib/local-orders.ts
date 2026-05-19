// lib/local-orders.ts

import { LOCAL_STORAGE_KEYS } from "../lib/local-storage-keys"

export type Currency = "THB" | "MMK"

export type LocalOrder = {
  id: string
  orderNumber: string
  customerName: string

  orderStatus?:
    | "new_order"
    | "waiting_deposit"
    | "deposit_paid"
    | "ordered_from_retailer"
    | "received_from_retailer"
    | "sent_to_cargo"
    | "in_delivery"
    | "delivered"
    | "completed"
    | "cancelled"

  paymentStatus:
    | "not_paid"
    | "receiving"
    | "deposit_paid"
    | "partially_paid"
    | "fully_paid"
    | "refunded"

  deliveryStatus:
    | "not_arranged"
    | "product_bought"
    | "waiting_pickup"
    | "picked_up"
    | "sent_to_cargo"
    | "in_transit"
    | "delivered"
    | "delayed"
    | "returned"

  baseCurrency: "THB"
  customerCurrency: Currency
  exchangeRateThbToMmk: number

  totalRetailerCostThb: number
  totalCustomerPayableThb: number
  totalPaidThb: number
  remainingBalanceThb: number
  profitThb: number

  createdAt: string

  facebookName?: string
  phone?: string
  address?: string

  sourceType?: string
  savePhoto?: boolean
  customerMessageBurmese?: string
  productSize?: string
  productColor?: string
  productDescription?: string
  productPhotoName?: string
  productPhotoDataUrl?: string
  orderScreenshotName?: string
  orderScreenshotDataUrl?: string

  productName?: string
  productOption?: string
  quantity?: number
  productNote?: string

  retailerName?: string
  retailerLineId?: string

  retailerUnitPriceThb?: number
  sellingUnitPriceThb?: number
  customerDeliveryFeeThb?: number
  cargoFeeThb?: number
  otherCostThb?: number

  depositAmountOriginal?: number
  depositCurrency?: Currency
  depositAmountThb?: number
  paymentMethod?: string

  cargoCompanyName?: string
  trackingNumber?: string
}

export const sampleOrders: LocalOrder[] = [
  {
    id: "1",
    orderNumber: "ORD-0001",
    customerName: "May",
    paymentStatus: "not_paid",
    deliveryStatus: "not_arranged",
    baseCurrency: "THB",
    customerCurrency: "MMK",
    exchangeRateThbToMmk: 120,
    totalRetailerCostThb: 1000,
    totalCustomerPayableThb: 1600,
    totalPaidThb: 0,
    remainingBalanceThb: 1600,
    profitThb: 600,
    createdAt: "2026-05-11T00:00:00.000Z",
    productName: "Dress",
    quantity: 2,
    retailerName: "Bangkok Shop",
  },
  {
    id: "2",
    orderNumber: "ORD-0002",
    customerName: "Nandar",
    paymentStatus: "not_paid",
    deliveryStatus: "not_arranged",
    baseCurrency: "THB",
    customerCurrency: "MMK",
    exchangeRateThbToMmk: 121,
    totalRetailerCostThb: 850,
    totalCustomerPayableThb: 1300,
    totalPaidThb: 0,
    remainingBalanceThb: 1300,
    profitThb: 450,
    createdAt: "2026-05-11T00:00:00.000Z",
    productName: "Shoes",
    quantity: 1,
    retailerName: "LINE Retailer",
  },
  {
    id: "3",
    orderNumber: "ORD-0003",
    customerName: "Aye",
    paymentStatus: "partially_paid",
    deliveryStatus: "in_transit",
    baseCurrency: "THB",
    customerCurrency: "THB",
    exchangeRateThbToMmk: 120,
    totalRetailerCostThb: 2200,
    totalCustomerPayableThb: 3100,
    totalPaidThb: 1500,
    remainingBalanceThb: 1600,
    profitThb: 900,
    createdAt: "2026-05-11T00:00:00.000Z",
    productName: "Bag",
    quantity: 1,
    retailerName: "Thai Bag Shop",
  },
  {
    id: "4",
    orderNumber: "ORD-0004",
    customerName: "Hnin",
    paymentStatus: "fully_paid",
    deliveryStatus: "delivered",
    baseCurrency: "THB",
    customerCurrency: "MMK",
    exchangeRateThbToMmk: 119,
    totalRetailerCostThb: 3000,
    totalCustomerPayableThb: 4200,
    totalPaidThb: 4200,
    remainingBalanceThb: 0,
    profitThb: 1200,
    createdAt: "2026-05-11T00:00:00.000Z",
    productName: "Cosmetics Set",
    quantity: 3,
    retailerName: "Beauty Retailer",
  },
]

export function getOrdersFromLocalStorage() {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEYS.orders)

  if (!stored) {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEYS.orders,
      JSON.stringify(sampleOrders)
    )

    return sampleOrders
  }

  try {
    return JSON.parse(stored) as LocalOrder[]
  } catch {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEYS.orders,
      JSON.stringify(sampleOrders)
    )

    return sampleOrders
  }
}

export function saveOrdersToLocalStorage(orders: LocalOrder[]) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    LOCAL_STORAGE_KEYS.orders,
    JSON.stringify(orders)
  )
}

export function resetOrdersLocalStorage() {
  if (typeof window === "undefined") return sampleOrders

  window.localStorage.setItem(
    LOCAL_STORAGE_KEYS.orders,
    JSON.stringify(sampleOrders)
  )

  return sampleOrders
}

export function createOrderNumber(orderCount: number) {
  return `ORD-${String(orderCount + 1).padStart(4, "0")}`
}
