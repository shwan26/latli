import type {
  LocalOrder,
  OrderStatus,
  PaymentStatus,
} from "@/app/lib/local-orders"

import { check, fetchAllRows, getDb } from "./shared"

type OrderRow = {
  id: string
  order_number: string
  customer_name: string
  facebook_name: string
  phone: string
  address: string
  order_status: OrderStatus
  payment_status: PaymentStatus
  customer_currency: LocalOrder["customerCurrency"]
  exchange_rate_thb_to_mmk: number
  total_retailer_cost_thb: number
  total_customer_payable_thb: number
  total_paid_thb: number
  remaining_balance_thb: number
  profit_thb: number
  product_name: string
  product_size: string
  product_color: string
  product_description: string
  quantity: number
  retailer_unit_price_thb: number
  selling_unit_price_thb: number
  customer_message: string
  retailer_name: string
  source_type: string
  product_photo_name: string
  product_photo_path: string | null
  screenshot_path: string | null
  created_at: string
  updated_at: string
}

// An order to save. The id, order number and dates come from the database
// unless an order number or created date is given (used when importing).
export type OrderInput = Omit<
  LocalOrder,
  "id" | "orderNumber" | "createdAt" | "updatedAt"
> & { orderNumber?: string; createdAt?: string }

function fromRow(row: OrderRow): LocalOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    facebookName: row.facebook_name,
    phone: row.phone,
    address: row.address,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    baseCurrency: "THB",
    customerCurrency: row.customer_currency,
    exchangeRateThbToMmk: Number(row.exchange_rate_thb_to_mmk),
    totalRetailerCostThb: Number(row.total_retailer_cost_thb),
    totalCustomerPayableThb: Number(row.total_customer_payable_thb),
    totalPaidThb: Number(row.total_paid_thb),
    remainingBalanceThb: Number(row.remaining_balance_thb),
    profitThb: Number(row.profit_thb),
    productName: row.product_name,
    productSize: row.product_size,
    productOption: row.product_size,
    productColor: row.product_color,
    productDescription: row.product_description,
    productNote: row.product_description,
    quantity: row.quantity,
    retailerUnitPriceThb: Number(row.retailer_unit_price_thb),
    sellingUnitPriceThb: Number(row.selling_unit_price_thb),
    customerMessageBurmese: row.customer_message,
    retailerName: row.retailer_name,
    sourceType: row.source_type,
    productPhotoName: row.product_photo_name,
    productPhotoPath: row.product_photo_path ?? undefined,
    orderScreenshotPath: row.screenshot_path ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toColumns(order: OrderInput) {
  return {
    customer_name: order.customerName,
    facebook_name: order.facebookName ?? "",
    phone: order.phone ?? "",
    address: order.address ?? "",
    order_status: order.orderStatus,
    payment_status: order.paymentStatus,
    customer_currency: order.customerCurrency,
    exchange_rate_thb_to_mmk: order.exchangeRateThbToMmk,
    total_retailer_cost_thb: order.totalRetailerCostThb,
    total_customer_payable_thb: order.totalCustomerPayableThb,
    total_paid_thb: order.totalPaidThb,
    remaining_balance_thb: order.remainingBalanceThb,
    profit_thb: order.profitThb,
    product_name: order.productName ?? "",
    product_size: order.productSize ?? order.productOption ?? "",
    product_color: order.productColor ?? "",
    product_description: order.productDescription ?? order.productNote ?? "",
    quantity: order.quantity ?? 1,
    retailer_unit_price_thb: order.retailerUnitPriceThb ?? 0,
    selling_unit_price_thb: order.sellingUnitPriceThb ?? 0,
    customer_message: order.customerMessageBurmese ?? "",
    retailer_name: order.retailerName ?? "",
    source_type: order.sourceType ?? "customer_chat",
    product_photo_name: order.productPhotoName ?? "",
    product_photo_path: order.productPhotoPath ?? null,
    screenshot_path: order.orderScreenshotPath ?? null,
  }
}

export async function listOrders() {
  const rows = await fetchAllRows<OrderRow>("Could not load orders", (from, to) =>
    getDb()
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to)
  )

  return rows.map(fromRow)
}

export async function getOrder(id: string) {
  const { data, error } = await getDb()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<OrderRow>()

  check(error, "Could not load the order")

  return data ? fromRow(data) : null
}

export async function insertOrder(order: OrderInput) {
  const { data, error } = await getDb()
    .from("orders")
    .insert({
      ...toColumns(order),
      ...(order.orderNumber ? { order_number: order.orderNumber } : {}),
      ...(order.createdAt ? { created_at: order.createdAt } : {}),
    })
    .select("*")
    .single<OrderRow>()

  check(error, "Could not save the order")

  return fromRow(data!)
}

export async function updateOrder(order: LocalOrder) {
  const { data, error } = await getDb()
    .from("orders")
    .update(toColumns(order))
    .eq("id", order.id)
    .select("*")
    .single<OrderRow>()

  check(error, "Could not save the order")

  return fromRow(data!)
}

// Copies edited customer details onto all of that customer's orders.
export async function updateOrdersCustomer(
  orderIds: string[],
  customer: {
    name: string
    facebookName: string
    phone: string
    address: string
  }
) {
  if (orderIds.length === 0) return

  const { error } = await getDb()
    .from("orders")
    .update({
      customer_name: customer.name,
      facebook_name: customer.facebookName,
      phone: customer.phone,
      address: customer.address,
    })
    .in("id", orderIds)

  check(error, "Could not update the customer's orders")
}
