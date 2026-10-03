import type { LocalShop, LocalShopProduct } from "@/app/lib/local-shops"

import { removePhotos } from "./photos"
import { check, fetchAllRows, getDb } from "./shared"

type ProductRow = {
  id: string
  name: string
  price_thb: number
  note: string
  image_path: string | null
  updated_at: string
}

type ShopRow = {
  id: string
  name: string
  owner_name: string
  phone: string
  location: string
  note: string
  created_at: string
  updated_at: string
  shop_products: ProductRow[] | null
}

export type ShopInput = {
  name: string
  ownerName: string
  phone: string
  location: string
  note: string
  createdAt?: string
}

export type ProductInput = {
  name: string
  priceThb: number
  note: string
  imagePath?: string
  createdAt?: string
}

function productFromRow(row: ProductRow): LocalShopProduct {
  return {
    id: row.id,
    name: row.name,
    priceThb: Number(row.price_thb),
    note: row.note,
    imagePath: row.image_path ?? undefined,
    updatedAt: row.updated_at,
  }
}

function fromRow(row: ShopRow): LocalShop {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    phone: row.phone,
    location: row.location,
    note: row.note,
    products: (row.shop_products ?? []).map(productFromRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toColumns(shop: ShopInput) {
  return {
    name: shop.name,
    owner_name: shop.ownerName,
    phone: shop.phone,
    location: shop.location,
    note: shop.note,
  }
}

export async function listShops() {
  const rows = await fetchAllRows<ShopRow>("Could not load shops", (from, to) =>
    getDb()
      .from("shops")
      .select("*, shop_products(*)")
      .order("created_at", { ascending: true })
      .order("created_at", { referencedTable: "shop_products", ascending: true })
      .range(from, to)
  )

  return rows.map(fromRow)
}

export async function insertShop(shop: ShopInput) {
  const { data, error } = await getDb()
    .from("shops")
    .insert({
      ...toColumns(shop),
      ...(shop.createdAt ? { created_at: shop.createdAt } : {}),
    })
    .select("*")
    .single<ShopRow>()

  check(error, "Could not save the shop")

  return fromRow(data!)
}

export async function updateShop(id: string, shop: ShopInput) {
  const { error } = await getDb()
    .from("shops")
    .update(toColumns(shop))
    .eq("id", id)

  check(error, "Could not save the shop")
}

// Deletes the shop, its products (cascade) and their photos.
export async function deleteShop(shop: LocalShop) {
  const { error } = await getDb().from("shops").delete().eq("id", shop.id)

  check(error, "Could not delete the shop")

  await removePhotos(shop.products.map((product) => product.imagePath))
}

export async function insertProduct(shopId: string, product: ProductInput) {
  const { data, error } = await getDb()
    .from("shop_products")
    .insert({
      shop_id: shopId,
      name: product.name,
      price_thb: product.priceThb,
      note: product.note,
      image_path: product.imagePath ?? null,
      ...(product.createdAt ? { created_at: product.createdAt } : {}),
    })
    .select("*")
    .single<ProductRow>()

  check(error, "Could not save the product")

  return productFromRow(data!)
}

export async function deleteProduct(product: LocalShopProduct) {
  const { error } = await getDb()
    .from("shop_products")
    .delete()
    .eq("id", product.id)

  check(error, "Could not remove the product")

  await removePhotos([product.imagePath])
}
