export type LocalShopProduct = {
  id: string
  name: string
  priceThb: number
  note: string // variants such as color and size
  imagePath?: string // file in the Supabase "photos" bucket
  updatedAt?: string
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
  updatedAt?: string
}

export type LocalCargoCompany = {
  id: string
  name: string
  phone: string
  location: string
  note: string
  createdAt: string
  updatedAt?: string
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
