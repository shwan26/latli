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
  // Links to the customer, product and cargo company. The names, the shop and
  // the product details below are read from those rows, not stored on the order.
  customerId?: string
  productId?: string
  cargoId?: string
  customerName: string
  facebookName?: string
  phone?: string
  address?: string
  shopId?: string
  retailerName?: string
  productName?: string
  productVariant?: string // the product's size, variant and color in one line
  productDetails?: { size: string; variant: string; color: string }
  productPrice?: number // the product's current price per unit
  cargoName?: string

  orderStatus: OrderStatus
  paymentStatus: PaymentStatus

  // Plain numbers in the account's primary currency (profile). The retailer
  // total is the product price x quantity when the order was saved. The
  // selling total is typed by the user and can include delivery and so on.
  quantity: number
  totalRetailerPrice: number
  totalSellingPrice: number

  customerMessageBurmese?: string
  productPhotoName?: string
  // Files in the Supabase "photos" bucket.
  productPhotoPath?: string
  orderScreenshotPath?: string

  createdAt: string
  updatedAt?: string
}
