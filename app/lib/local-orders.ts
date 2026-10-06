// Order types and the status options used across the app.

export const CURRENCIES = ["THB", "MMK", "USD", "SGD", "CNY", "MYR", "JPY"] as const

export type Currency = (typeof CURRENCIES)[number]

export type OrderStatus =
  | "not_bought"
  | "bought"
  | "sent_cargo"
  | "delivered"
  | "returned"
  | "complete"

export type PaymentStatus =
  | "not_paid"
  | "partially_paid"
  | "fully_paid"
  | "refunded"

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  not_bought: "Not bought",
  bought: "Bought",
  sent_cargo: "Sent to cargo",
  delivered: "Delivered",
  returned: "Returned",
  complete: "Complete",
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_paid: "Not paid",
  partially_paid: "Partially / deposit paid",
  fully_paid: "Fully paid",
  refunded: "Refunded",
}

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]

export type LocalOrder = {
  id: string
  orderNumber: string
  customerName: string

  orderStatus: OrderStatus
  paymentStatus: PaymentStatus

  // The *Thb money fields below are legacy names: they hold amounts in
  // baseCurrency. exchangeRateThbToMmk means 1 baseCurrency = N customerCurrency.
  baseCurrency: Currency
  customerCurrency: Currency
  exchangeRateThbToMmk: number

  totalRetailerCostThb: number
  totalCustomerPayableThb: number
  totalPaidThb: number
  remainingBalanceThb: number
  profitThb: number

  createdAt: string
  updatedAt?: string

  facebookName?: string
  phone?: string
  address?: string

  sourceType?: string
  customerMessageBurmese?: string
  productSize?: string
  productColor?: string
  productDescription?: string
  productPhotoName?: string
  // Files in the Supabase "photos" bucket.
  productPhotoPath?: string
  orderScreenshotPath?: string

  productName?: string
  productOption?: string
  quantity?: number
  productNote?: string

  retailerName?: string
  cargoName?: string

  retailerUnitPriceThb?: number
  sellingUnitPriceThb?: number
}
