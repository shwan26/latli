export type LocalShopProduct = {
  id: string
  name: string
  price: number
  size: string
  variant: string
  color: string
  imagePath?: string // file in the Supabase "photos" bucket
  updatedAt?: string
}

// "M · Red · Cotton": the filled-in size, variant and color of a product.
export function describeProduct(product: {
  size?: string
  variant?: string
  color?: string
}) {
  return [product.size, product.variant, product.color]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ")
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
