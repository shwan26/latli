"use client"

import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import {
  IconArrowLeft,
  IconBuildingStore,
  IconMapPin,
  IconPackage,
  IconPlus,
  IconUser,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  emptyShopDraft,
  getLocalShops,
  saveLocalShops,
  type LocalShop,
  type LocalShopProduct,
} from "../lib/local-shops"

type ShopDraft = typeof emptyShopDraft

type ProductDraft = {
  name: string
  priceThb: string
  note: string
}

const emptyProductDraft: ProductDraft = {
  name: "",
  priceThb: "",
  note: "",
}

function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatBaht(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ShopsPage() {
  const [mounted, setMounted] = useState(false)
  const [shops, setShops] = useState<LocalShop[]>([])
  const [shopDraft, setShopDraft] = useState<ShopDraft>(emptyShopDraft)
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({})
  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    const loadShops = window.setTimeout(() => {
      setShops(getLocalShops())
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(loadShops)
  }, [])

  function updateShopDraft(key: keyof ShopDraft, value: string) {
    setSavedMessage("")
    setShopDraft((current) => ({ ...current, [key]: value }))
  }

  function handleAddShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextShops = [
      ...shops,
      {
        id: crypto.randomUUID(),
        ...shopDraft,
        name: shopDraft.name.trim(),
        products: [],
        createdAt: new Date().toISOString(),
      },
    ]

    setShops(nextShops)
    saveLocalShops(nextShops)
    setShopDraft(emptyShopDraft)
    setSavedMessage("Shop added.")
  }

  function updateProductDraft(
    shopId: string,
    key: keyof ProductDraft,
    value: string
  ) {
    setSavedMessage("")
    setProductDrafts((current) => ({
      ...current,
      [shopId]: {
        ...(current[shopId] ?? emptyProductDraft),
        [key]: value,
      },
    }))
  }

  function handleAddProduct(shopId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const draft = productDrafts[shopId] ?? emptyProductDraft
    const product: LocalShopProduct = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      priceThb: toNumber(draft.priceThb),
      note: draft.note,
    }

    const nextShops = shops.map((shop) =>
      shop.id === shopId
        ? { ...shop, products: [...shop.products, product] }
        : shop
    )

    setShops(nextShops)
    saveLocalShops(nextShops)
    setProductDrafts((current) => ({ ...current, [shopId]: emptyProductDraft }))
    setSavedMessage("Product added.")
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading shops...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/more" aria-label="Back to more">
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Buying network</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Shops
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        {savedMessage ? (
          <Alert className="rounded-xl">
            <AlertDescription>{savedMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconBuildingStore className="size-5 text-muted-foreground" />
              Add Shop
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAddShop} className="space-y-4">
              <TextInput
                id="shopName"
                label="Shop name"
                value={shopDraft.name}
                onChange={(value) => updateShopDraft("name", value)}
                placeholder="Bangkok shop"
                required
              />
              <TextInput
                id="shopOwner"
                label="Owner or contact"
                value={shopDraft.ownerName}
                onChange={(value) => updateShopDraft("ownerName", value)}
                placeholder="Contact name"
              />
              <TextInput
                id="shopPhone"
                label="Phone or LINE"
                value={shopDraft.phone}
                onChange={(value) => updateShopDraft("phone", value)}
                placeholder="Phone number or LINE ID"
                type="tel"
              />
              <div className="space-y-2">
                <Label htmlFor="shopLocation">Location</Label>
                <Textarea
                  id="shopLocation"
                  value={shopDraft.location}
                  onChange={(event) =>
                    updateShopDraft("location", event.target.value)
                  }
                  placeholder="Shop address, mall, market, or pickup location"
                  className="min-h-24 rounded-xl text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopNote">Shop info</Label>
                <Textarea
                  id="shopNote"
                  value={shopDraft.note}
                  onChange={(event) => updateShopDraft("note", event.target.value)}
                  placeholder="Opening hours, buying notes, payment terms"
                  className="min-h-24 rounded-xl text-base"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl">
                <IconPlus className="mr-2 size-5" />
                Add Shop
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">Saved Shops</h2>
            <Badge variant="secondary">{shops.length}</Badge>
          </div>

          {shops.length === 0 ? (
            <Card className="rounded-[20px] shadow-none">
              <CardContent className="p-5 text-sm text-muted-foreground">
                No shops saved yet.
              </CardContent>
            </Card>
          ) : (
            shops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                draft={productDrafts[shop.id] ?? emptyProductDraft}
                onProductChange={(key, value) =>
                  updateProductDraft(shop.id, key, value)
                }
                onAddProduct={(event) => handleAddProduct(shop.id, event)}
              />
            ))
          )}
        </section>
      </div>

      <BottomNavigation active="shops" />
    </main>
  )
}

function ShopCard({
  shop,
  draft,
  onProductChange,
  onAddProduct,
}: {
  shop: LocalShop
  draft: ProductDraft
  onProductChange: (key: keyof ProductDraft, value: string) => void
  onAddProduct: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Card className="rounded-[20px] shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-lg font-medium">
                {shop.name}
              </h3>
              {shop.ownerName ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <IconUser className="size-4" />
                  {shop.ownerName}
                </p>
              ) : null}
            </div>
            <Badge variant="outline">
              {shop.products.length} product{shop.products.length === 1 ? "" : "s"}
            </Badge>
          </div>
          {shop.phone ? (
            <p className="text-sm text-muted-foreground">{shop.phone}</p>
          ) : null}
          {shop.location ? (
            <p className="flex items-start gap-1 text-sm text-muted-foreground">
              <IconMapPin className="mt-0.5 size-4 shrink-0" />
              <span>{shop.location}</span>
            </p>
          ) : null}
          {shop.note ? <p className="text-sm">{shop.note}</p> : null}
        </div>

        {shop.products.length > 0 ? (
          <div className="space-y-2 rounded-2xl border bg-muted/40 p-3">
            {shop.products.map((product) => (
              <div
                key={product.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  {product.note ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {product.note}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-muted-foreground">
                  {formatBaht(product.priceThb)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <form onSubmit={onAddProduct} className="space-y-3 rounded-2xl border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <IconPackage className="size-4 text-muted-foreground" />
            Add Product
          </div>
          <TextInput
            id={`productName-${shop.id}`}
            label="Product name"
            value={draft.name}
            onChange={(value) => onProductChange("name", value)}
            placeholder="Dress, shoes, bag"
            required
          />
          <TextInput
            id={`productPrice-${shop.id}`}
            label="Price THB"
            value={draft.priceThb}
            onChange={(value) => onProductChange("priceThb", value)}
            placeholder="0"
            type="number"
          />
          <div className="space-y-2">
            <Label htmlFor={`productNote-${shop.id}`}>Product note</Label>
            <Textarea
              id={`productNote-${shop.id}`}
              value={draft.note}
              onChange={(event) => onProductChange("note", event.target.value)}
              placeholder="Size, color, availability, buying note"
              className="min-h-20 rounded-xl text-base"
            />
          </div>
          <Button type="submit" variant="outline" className="h-11 w-full rounded-xl">
            <IconPlus className="mr-2 size-5" />
            Add Product
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "tel" ? "tel" : type === "number" ? "decimal" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 rounded-xl text-base"
      />
    </div>
  )
}
