import type {
  LocalOrder,
  OrderStatus,
  PaymentStatus,
} from "@/app/lib/local-orders"

import { describeProduct } from "@/app/lib/local-shops"

import { removePhotos } from "./photos"
import { check, fetchAllRows, getDb } from "./shared"

type OrderRow = {
  id: string
  order_number: string
  customer_id: string | null
  cargo_id: string | null
  product_id: string | null
  order_status: OrderStatus
  payment_status: PaymentStatus
  quantity: number
  total_retailer_price: number
  total_selling_price: number
  customer_message: string
  product_photo_name: string
  product_photo_path: string | null
  screenshot_path: string | null
  created_at: string
  updated_at: string
  customers: {
    name: string
    facebook_name: string
    phone: string
    address: string
  } | null
  cargo_companies: { name: string } | null
  shop_products: {
    name: string
    price: number
    size: string
    variant: string
    color: string
    shop_id: string
    shops: { name: string } | null
  } | null
}

// Orders store ids; the names come from the linked rows. The shop is reached
// through the product.
const ORDER_SELECT =
  "*, customers(name, facebook_name, phone, address), cargo_companies(name), shop_products(name, price, size, variant, color, shop_id, shops(name))"

// An order to save. The id, order number and dates come from the database
// unless an order number or created date is given (used when importing).
export type OrderInput = Omit<
  LocalOrder,
  "id" | "orderNumber" | "createdAt" | "updatedAt"
> & { orderNumber?: string; createdAt?: string }

// Amounts are plain numbers. The currency label comes from the profile (see
// lib/profile.ts), not from the order.
function fromRow(row: OrderRow): LocalOrder {
  const product = row.shop_products

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id ?? undefined,
    productId: row.product_id ?? undefined,
    cargoId: row.cargo_id ?? undefined,
    customerName: row.customers?.name ?? "",
    facebookName: row.customers?.facebook_name ?? "",
    phone: row.customers?.phone ?? "",
    address: row.customers?.address ?? "",
    shopId: product?.shop_id,
    retailerName: product?.shops?.name ?? "",
    productName: product?.name ?? "",
    productVariant: product ? describeProduct(product) : "",
    productDetails: product
      ? { size: product.size, variant: product.variant, color: product.color }
      : undefined,
    productPrice: product ? Number(product.price) : undefined,
    cargoName: row.cargo_companies?.name ?? "",
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    quantity: row.quantity,
    totalRetailerPrice: Number(row.total_retailer_price),
    totalSellingPrice: Number(row.total_selling_price),
    customerMessageBurmese: row.customer_message,
    productPhotoName: row.product_photo_name,
    productPhotoPath: row.product_photo_path ?? undefined,
    orderScreenshotPath: row.screenshot_path ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toColumns(order: OrderInput) {
  return {
    customer_id: order.customerId ?? null,
    cargo_id: order.cargoId ?? null,
    product_id: order.productId ?? null,
    order_status: order.orderStatus,
    payment_status: order.paymentStatus,
    quantity: order.quantity,
    total_retailer_price: order.totalRetailerPrice,
    total_selling_price: order.totalSellingPrice,
    customer_message: order.customerMessageBurmese ?? "",
    product_photo_name: order.productPhotoName ?? "",
    product_photo_path: order.productPhotoPath ?? null,
    screenshot_path: order.orderScreenshotPath ?? null,
  }
}

export async function listOrders() {
  const rows = await fetchAllRows<OrderRow>("Could not load orders", (from, to) =>
    getDb()
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .range(from, to)
  )

  return rows.map(fromRow)
}

export async function getOrder(id: string) {
  const { data, error } = await getDb()
    .from("orders")
    .select(ORDER_SELECT)
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
    .select(ORDER_SELECT)
    .single<OrderRow>()

  check(error, "Could not save the order")

  return fromRow(data!)
}

export async function updateOrder(order: LocalOrder) {
  const { data, error } = await getDb()
    .from("orders")
    .update(toColumns(order))
    .eq("id", order.id)
    .select(ORDER_SELECT)
    .single<OrderRow>()

  check(error, "Could not save the order")

  return fromRow(data!)
}

// Deletes the order and its photos.
export async function deleteOrder(order: LocalOrder) {
  const { error } = await getDb().from("orders").delete().eq("id", order.id)

  check(error, "Could not delete the order")

  await removePhotos([order.productPhotoPath, order.orderScreenshotPath])
}
