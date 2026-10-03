import { LOCAL_STORAGE_KEYS } from "./local-storage-keys"

export type LocalShopProduct = {
  id: string
  name: string
  priceThb: number
  note: string
}

export type LocalShop = {
  id: string
  name: string
  ownerName: string
  phone: string
  location: string
  note: string
  products: LocalShopProduct[]
  createdAt: string
}

export type LocalCargoCompany = {
  id: string
  name: string
  phone: string
  location: string
  note: string
  createdAt: string
}

export const emptyShopDraft = {
  name: "",
  ownerName: "",
  phone: "",
  location: "",
  note: "",
}

export const emptyCargoDraft = {
  name: "",
  phone: "",
  location: "",
  note: "",
}

export function getLocalShops(): LocalShop[] {
  return getStoredList<LocalShop>(LOCAL_STORAGE_KEYS.shops).map((shop) => ({
    ...shop,
    products: Array.isArray(shop.products) ? shop.products : [],
  }))
}

export function saveLocalShops(shops: LocalShop[]) {
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.shops, JSON.stringify(shops))
}

export function getLocalCargoCompanies(): LocalCargoCompany[] {
  return getStoredList<LocalCargoCompany>(LOCAL_STORAGE_KEYS.cargoCompanies)
}

export function saveLocalCargoCompanies(companies: LocalCargoCompany[]) {
  window.localStorage.setItem(
    LOCAL_STORAGE_KEYS.cargoCompanies,
    JSON.stringify(companies)
  )
}

function getStoredList<T>(key: string): T[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(key)

  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}
