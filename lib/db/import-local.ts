// Moves data saved in this browser (before accounts existed) into the signed-in
// user's Supabase account. The browser copy is never deleted. Progress is
// remembered per user, so a failed import can be retried without duplicates.

import type { OrderStatus, PaymentStatus } from "@/app/lib/local-orders"
import { LOCAL_STORAGE_KEYS } from "@/app/lib/local-storage-keys"

import { translate } from "@/lib/i18n/runtime"

import { insertCargo } from "./cargo"
import { insertCustomer } from "./customers"
import { insertOrder } from "./orders"
import { uploadPhoto } from "./photos"
import { getDb, messageOf } from "./shared"
import { insertProduct, insertShop } from "./shops"

type LegacyOrder = {
  id: string
  orderNumber?: string
  customerName?: string
  orderStatus?: string
  paymentStatus?: string
  deliveryStatus?: string
  customerCurrency?: "THB" | "MMK"
  exchangeRateThbToMmk?: number
  totalRetailerCostThb?: number
  totalCustomerPayableThb?: number
  totalPaidThb?: number
  remainingBalanceThb?: number
  profitThb?: number
  createdAt?: string
  facebookName?: string
  phone?: string
  address?: string
  sourceType?: string
  customerMessageBurmese?: string
  productSize?: string
  productOption?: string
  productColor?: string
  productDescription?: string
  productNote?: string
  productPhotoName?: string
  productPhotoDataUrl?: string
  orderScreenshotDataUrl?: string
  productName?: string
  quantity?: number
  retailerName?: string
  retailerUnitPriceThb?: number
  sellingUnitPriceThb?: number
}

type LegacyCustomer = {
  id: string
  name?: string
  facebookName?: string
  phone?: string
  address?: string
  otherContacts?: string
  createdAt?: string
}

type LegacyProduct = {
  id: string
  name?: string
  priceThb?: number
  note?: string
  imageDataUrl?: string
}

type LegacyShop = {
  id: string
  name?: string
  ownerName?: string
  phone?: string
  location?: string
  note?: string
  createdAt?: string
  products?: LegacyProduct[]
}

type LegacyCargo = {
  id: string
  name?: string
  phone?: string
  location?: string
  note?: string
  createdAt?: string
}

type Progress = {
  done: string[]
  shopIds: Record<string, string>
}

export type LocalDataSummary = {
  orders: number
  customers: number
  shops: number
  products: number
  cargo: number
}

// Orders that older versions of the app created as demo data.
const SAMPLE_CREATED_AT = "2026-05-11T00:00:00.000Z"
const SAMPLE_IDS = new Set(["1", "2", "3", "4"])

function readList<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]")

    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function readLegacy() {
  return {
    orders: readList<LegacyOrder>(LOCAL_STORAGE_KEYS.orders).filter(
      (order) => !(SAMPLE_IDS.has(order.id) && order.createdAt === SAMPLE_CREATED_AT)
    ),
    customers: readList<LegacyCustomer>(LOCAL_STORAGE_KEYS.customers),
    shops: readList<LegacyShop>(LOCAL_STORAGE_KEYS.shops),
    cargo: readList<LegacyCargo>(LOCAL_STORAGE_KEYS.cargoCompanies),
  }
}

async function getUserId() {
  const {
    data: { user },
  } = await getDb().auth.getUser()

  if (!user) throw new Error(translate("You are signed out. Log in again."))

  return user.id
}

const progressKey = (userId: string) => `latli_import_progress_${userId}`
const doneKey = (userId: string) => `latli_import_done_${userId}`

function readProgress(userId: string): Progress {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(progressKey(userId)) ?? "")

    return {
      done: Array.isArray(parsed?.done) ? parsed.done : [],
      shopIds: parsed?.shopIds && typeof parsed.shopIds === "object" ? parsed.shopIds : {},
    }
  } catch {
    return { done: [], shopIds: {} }
  }
}

function writeProgress(userId: string, progress: Progress) {
  window.localStorage.setItem(progressKey(userId), JSON.stringify(progress))
}

function mapOrderStatus(order: LegacyOrder): OrderStatus {
  if (order.orderStatus === "completed") return "complete"

  switch (order.deliveryStatus) {
    case "product_bought":
    case "waiting_pickup":
      return "bought"
    case "picked_up":
    case "sent_to_cargo":
    case "in_transit":
    case "delayed":
      return "sent_cargo"
    case "delivered":
      return "delivered"
    case "returned":
      return "returned"
    default:
      return "not_bought"
  }
}

function mapPaymentStatus(order: LegacyOrder): PaymentStatus {
  switch (order.paymentStatus) {
    case "deposit_paid":
    case "partially_paid":
      return "partially_paid"
    case "fully_paid":
      return "fully_paid"
    case "refunded":
      return "refunded"
    default:
      return "not_paid"
  }
}

function isImage(value?: string): value is string {
  return typeof value === "string" && value.startsWith("data:image/")
}

function validDate(value?: string) {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : undefined
}

// How much is waiting to be imported for the signed-in user, or null when
// there is nothing or it was already imported.
export async function getLocalDataSummary(): Promise<LocalDataSummary | null> {
  const userId = await getUserId()

  if (window.localStorage.getItem(doneKey(userId))) return null

  const { orders, customers, shops, cargo } = readLegacy()
  const summary = {
    orders: orders.length,
    customers: customers.length,
    shops: shops.length,
    products: shops.reduce((total, shop) => total + (shop.products?.length ?? 0), 0),
    cargo: cargo.length,
  }

  const total =
    summary.orders + summary.customers + summary.shops + summary.products + summary.cargo

  return total > 0 ? summary : null
}

export async function importLocalData(
  onProgress: (done: number, total: number) => void
) {
  const userId = await getUserId()
  const { orders, customers, shops, cargo } = readLegacy()
  const progress = readProgress(userId)
  const failures: string[] = []

  const total =
    orders.length +
    customers.length +
    shops.length +
    shops.reduce((count, shop) => count + (shop.products?.length ?? 0), 0) +
    cargo.length

  let finished = 0

  onProgress(0, total)

  // Runs one item unless an earlier attempt already imported it.
  async function step(key: string, label: string, action: () => Promise<void>) {
    if (progress.done.includes(key)) {
      finished += 1
      onProgress(finished, total)
      return
    }

    try {
      await action()
      progress.done.push(key)
      writeProgress(userId, progress)
    } catch (error) {
      failures.push(`${label}: ${messageOf(error, "failed")}`)
    }

    finished += 1
    onProgress(finished, total)
  }

  for (const customer of customers) {
    await step(`customer:${customer.id}`, `Customer ${customer.name ?? ""}`, async () => {
      await insertCustomer({
        name: customer.name?.trim() || "Customer",
        facebookName: customer.facebookName ?? "",
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        otherContacts: customer.otherContacts ?? "",
        createdAt: validDate(customer.createdAt),
      })
    })
  }

  for (const shop of shops) {
    await step(`shop:${shop.id}`, `Shop ${shop.name ?? ""}`, async () => {
      const created = await insertShop({
        name: shop.name?.trim() || "Shop",
        ownerName: shop.ownerName ?? "",
        phone: shop.phone ?? "",
        location: shop.location ?? "",
        note: shop.note ?? "",
        createdAt: validDate(shop.createdAt),
      })

      progress.shopIds[shop.id] = created.id
    })

    for (const product of shop.products ?? []) {
      await step(`product:${product.id}`, `Product ${product.name ?? ""}`, async () => {
        const shopId = progress.shopIds[shop.id]

        if (!shopId) throw new Error(translate("its shop was not imported"))

        await insertProduct(shopId, {
          name: product.name?.trim() || "Product",
          priceThb: Number(product.priceThb) || 0,
          note: product.note ?? "",
          imagePath: isImage(product.imageDataUrl)
            ? await uploadPhoto(product.imageDataUrl, "products")
            : undefined,
        })
      })
    }
  }

  for (const company of cargo) {
    await step(`cargo:${company.id}`, `Cargo ${company.name ?? ""}`, async () => {
      await insertCargo({
        name: company.name?.trim() || "Cargo",
        phone: company.phone ?? "",
        location: company.location ?? "",
        note: company.note ?? "",
        createdAt: validDate(company.createdAt),
      })
    })
  }

  // Oldest first, so the numbers the database hands out stay in order.
  const sortedOrders = [...orders].sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
  )

  for (const order of sortedOrders) {
    await step(`order:${order.id}`, `Order ${order.orderNumber ?? ""}`, async () => {
      const productPhotoPath = isImage(order.productPhotoDataUrl)
        ? await uploadPhoto(order.productPhotoDataUrl, "orders")
        : undefined
      const orderScreenshotPath =
        isImage(order.orderScreenshotDataUrl) &&
        order.orderScreenshotDataUrl !== order.productPhotoDataUrl
          ? await uploadPhoto(order.orderScreenshotDataUrl, "orders")
          : undefined

      const input = {
        customerName: order.customerName ?? "",
        facebookName: order.facebookName ?? "",
        phone: order.phone ?? "",
        address: order.address ?? "",
        orderStatus: mapOrderStatus(order),
        paymentStatus: mapPaymentStatus(order),
        baseCurrency: "THB" as const,
        customerCurrency: order.customerCurrency ?? ("MMK" as const),
        exchangeRateThbToMmk: order.exchangeRateThbToMmk || 1,
        totalRetailerCostThb: order.totalRetailerCostThb ?? 0,
        totalCustomerPayableThb: order.totalCustomerPayableThb ?? 0,
        totalPaidThb: order.totalPaidThb ?? 0,
        remainingBalanceThb: order.remainingBalanceThb ?? 0,
        profitThb: order.profitThb ?? 0,
        productName: order.productName ?? "",
        productSize: order.productSize ?? order.productOption ?? "",
        productColor: order.productColor ?? "",
        productDescription: order.productDescription ?? order.productNote ?? "",
        quantity: order.quantity && order.quantity > 0 ? order.quantity : 1,
        retailerUnitPriceThb: order.retailerUnitPriceThb ?? 0,
        sellingUnitPriceThb: order.sellingUnitPriceThb ?? 0,
        customerMessageBurmese: order.customerMessageBurmese ?? "",
        retailerName: order.retailerName ?? "",
        sourceType: order.sourceType,
        productPhotoName: order.productPhotoName ?? "",
        productPhotoPath,
        orderScreenshotPath,
        createdAt: validDate(order.createdAt),
      }

      try {
        await insertOrder({ ...input, orderNumber: order.orderNumber })
      } catch (error) {
        // Two old orders can share a number. Let the database pick a new one.
        if (/duplicate key|unique/i.test(messageOf(error, ""))) {
          await insertOrder(input)
        } else {
          throw error
        }
      }
    })
  }

  if (failures.length === 0) {
    window.localStorage.setItem(doneKey(userId), new Date().toISOString())
  }

  return { imported: finished - failures.length, failures }
}
