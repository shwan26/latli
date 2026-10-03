"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  IconMapPin,
  IconPackage,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  emptyShopDraft,
  type LocalShop,
  type LocalShopProduct,
} from "../lib/local-shops"
import { resizeImageToDataUrl } from "../lib/image-resize"
import {
  getPhotoExpiry,
  getPhotoUrls,
  keepPhotosLonger,
  removePhotos,
  uploadPhoto,
} from "@/lib/db/photos"
import { UpgradeLink } from "@/components/upgrade-link"
import { fetchProfile, type ProfileSettings } from "@/lib/profile"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { messageOf } from "@/lib/db/shared"
import {
  deleteProduct,
  deleteShop,
  insertProduct,
  insertShop,
  listShops,
  updateShop,
} from "@/lib/db/shops"

type ShopDraft = typeof emptyShopDraft

type ProductDraft = {
  name: string
  priceThb: string
  note: string
  imageDataUrl: string
}

const emptyProductDraft: ProductDraft = {
  name: "",
  priceThb: "",
  note: "",
  imageDataUrl: "",
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
  const [savedMessage, setSavedMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"name" | "newest">("name")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<ShopDraft>(emptyShopDraft)
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [photoExpiry, setPhotoExpiry] = useState<Record<string, string>>({})
  const [isPro, setIsPro] = useState(false)
  const [account, setAccount] = useState<ProfileSettings | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const loaded = await listShops()

        if (cancelled) return

        setShops(loaded)

        const paths = loaded.flatMap((shop) =>
          shop.products.map((product) => product.imagePath)
        )
        const [urls, expiry, profile] = await Promise.all([
          getPhotoUrls(paths),
          getPhotoExpiry(paths),
          isSupabaseConfigured ? fetchProfile(createClient()) : null,
        ])

        if (cancelled) return

        setPhotoUrls(urls)
        setPhotoExpiry(expiry)
        setIsPro(profile?.plan === "pro")
        setAccount(profile)
      } catch (error) {
        if (!cancelled) setErrorMessage(messageOf(error, "Could not load shops."))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedShop = shops.find((shop) => shop.id === selectedId) ?? null

  const visibleShops = useMemo(() => {
    const query = search.trim().toLowerCase()

    return shops
      .filter(
        (shop) =>
          !query ||
          [
            shop.name,
            shop.location,
            shop.ownerName,
            shop.phone,
            ...shop.products.map((product) => product.name),
          ].some((value) => value.toLowerCase().includes(query))
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : b.createdAt.localeCompare(a.createdAt)
      )
  }, [shops, search, sort])

  // Runs a save. Shows the message on success, or the error on failure.
  async function run(action: () => Promise<void>, successMessage: string) {
    setBusy(true)

    try {
      await action()
      setErrorMessage("")
      setSavedMessage(successMessage)
      return true
    } catch (error) {
      setSavedMessage("")
      setErrorMessage(messageOf(error, "Could not save."))
      return false
    } finally {
      setBusy(false)
    }
  }

  function updateShopDraft(key: keyof ShopDraft, value: string) {
    setSavedMessage("")
    setShopDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleAddShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await run(async () => {
      const shop = await insertShop({
        ...shopDraft,
        name: shopDraft.name.trim(),
      })

      setShops((current) => [...current, shop])
    }, "Shop added.")

    if (saved) {
      setShopDraft(emptyShopDraft)
      setAdding(false)
    }
  }

  function openAddShop() {
    setShopDraft(emptyShopDraft)
    setSavedMessage("")
    setErrorMessage("")
    setAdding(true)
  }

  function openShop(shop: LocalShop) {
    setSelectedId(shop.id)
    setEditing(false)
    setProductDraft(emptyProductDraft)
    setSavedMessage("")
    setErrorMessage("")
  }

  function closeShop() {
    setSelectedId(null)
    setEditing(false)
    setConfirmingDelete(false)
  }

  function startEditing(shop: LocalShop) {
    setEditDraft({
      name: shop.name,
      ownerName: shop.ownerName,
      phone: shop.phone,
      location: shop.location,
      note: shop.note,
    })
    setEditing(true)
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedShop) return

    const input = { ...editDraft, name: editDraft.name.trim() }

    const saved = await run(async () => {
      await updateShop(selectedShop.id, input)

      setShops((current) =>
        current.map((shop) =>
          shop.id === selectedShop.id ? { ...shop, ...input } : shop
        )
      )
    }, "Shop updated.")

    if (saved) setEditing(false)
  }

  async function handleDeleteShop() {
    if (!selectedShop) return

    const saved = await run(async () => {
      await deleteShop(selectedShop)

      setShops((current) => current.filter((shop) => shop.id !== selectedShop.id))
    }, "Shop deleted.")

    if (saved) closeShop()
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedShop) return

    const saved = await run(async () => {
      const imagePath = productDraft.imageDataUrl
        ? await uploadPhoto(productDraft.imageDataUrl, "products")
        : undefined

      let product: LocalShopProduct

      try {
        product = await insertProduct(selectedShop.id, {
          name: productDraft.name.trim(),
          priceThb: toNumber(productDraft.priceThb),
          note: productDraft.note.trim(),
          imagePath,
        })
      } catch (error) {
        await removePhotos([imagePath])
        throw error
      }

      if (imagePath) {
        const [urls, expiry] = await Promise.all([
          getPhotoUrls([imagePath]),
          getPhotoExpiry([imagePath]),
        ])

        setPhotoUrls((current) => ({ ...current, ...urls }))
        setPhotoExpiry((current) => ({ ...current, ...expiry }))
      }

      setShops((current) =>
        current.map((shop) =>
          shop.id === selectedShop.id
            ? { ...shop, products: [...shop.products, product] }
            : shop
        )
      )
    }, "Product added.")

    if (saved) setProductDraft(emptyProductDraft)
  }

  async function handleKeepPhotos() {
    if (!selectedShop) return

    const paths = selectedShop.products
      .map((product) => product.imagePath)
      .filter((path): path is string => !!path)

    await run(async () => {
      const until = await keepPhotosLonger(paths)

      setPhotoExpiry((current) => {
        const next = { ...current }

        for (const path of paths) next[path] = until

        return next
      })
    }, "Photos will be kept for a month.")
  }

  async function handleRemoveProduct(product: LocalShopProduct) {
    if (!selectedShop) return

    await run(async () => {
      await deleteProduct(product)

      setShops((current) =>
        current.map((shop) =>
          shop.id === selectedShop.id
            ? {
                ...shop,
                products: shop.products.filter((item) => item.id !== product.id),
              }
            : shop
        )
      )
    }, "Product removed.")
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
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {shops.length} shop{shops.length === 1 ? "" : "s"}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Shops
            </h1>
          </div>

          <Button
            type="button"
            size="icon"
            className="size-11 rounded-xl"
            aria-label="Add shop"
            onClick={openAddShop}
          >
            <IconPlus className="size-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        {errorMessage ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {savedMessage ? (
          <Alert className="rounded-xl">
            <AlertDescription>{savedMessage}</AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-3">
          {shops.length > 0 ? (
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search shop, location, product"
                  aria-label="Search shops"
                  className="h-12 rounded-xl pl-10 text-base"
                />
              </div>

              <Select
                value={sort}
                onValueChange={(value) => setSort(value as "name" | "newest")}
              >
                <SelectTrigger className="h-12 rounded-xl" aria-label="Sort shops">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">A to Z</SelectItem>
                  <SelectItem value="newest">Latest created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {shops.length === 0 ? (
            <Card className="rounded-[20px] shadow-none">
              <CardContent className="p-5 text-sm text-muted-foreground">
                No shops saved yet.
              </CardContent>
            </Card>
          ) : visibleShops.length === 0 ? (
            <Card className="rounded-[20px] shadow-none">
              <CardContent className="p-5 text-sm text-muted-foreground">
                No shops match your search.
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-[20px] shadow-none">
              <ul className="divide-y">
                {visibleShops.map((shop) => (
                  <li key={shop.id}>
                    <button
                      type="button"
                      onClick={() => openShop(shop)}
                      className="block w-full px-4 py-3 text-left transition hover:bg-muted/60 active:bg-muted"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{shop.name}</p>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {shop.location || "No location"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {shop.products.length} product
                          {shop.products.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle className="font-heading text-xl">Add Shop</SheetTitle>
            <SheetDescription>
              Products can be added after the shop is saved.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-4">
            {errorMessage ? (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

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
                label="Contact name (optional)"
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
                required
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
                  required
                  className="min-h-24 rounded-xl text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopNote">Shop info (optional)</Label>
                <Textarea
                  id="shopNote"
                  value={shopDraft.note}
                  onChange={(event) => updateShopDraft("note", event.target.value)}
                  placeholder="Opening hours, buying notes, payment terms"
                  className="min-h-24 rounded-xl text-base"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-xl" disabled={busy}>
                <IconPlus className="mr-2 size-5" />
                {busy ? "Saving..." : "Add Shop"}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={selectedShop !== null}
        onOpenChange={(open) => {
          if (!open) closeShop()
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          {selectedShop ? (
            <ShopDetail
              shop={selectedShop}
              editing={editing}
              editDraft={editDraft}
              productDraft={productDraft}
              busy={busy}
              photoUrls={photoUrls}
              photoExpiry={photoExpiry}
              isPro={isPro}
              account={account}
              onKeepPhotos={handleKeepPhotos}
              errorMessage={errorMessage}
              savedMessage={savedMessage}
              onEditChange={(key, value) =>
                setEditDraft((current) => ({ ...current, [key]: value }))
              }
              onStartEdit={() => startEditing(selectedShop)}
              onCancelEdit={() => setEditing(false)}
              onSaveEdit={handleSaveEdit}
              onDelete={() => setConfirmingDelete(true)}
              onProductChange={(key, value) =>
                setProductDraft((current) => ({ ...current, [key]: value }))
              }
              onAddProduct={handleAddProduct}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedShop?.name}?</DialogTitle>
            <DialogDescription>
              This removes the shop and its {selectedShop?.products.length ?? 0}{" "}
              product{selectedShop?.products.length === 1 ? "" : "s"}. Existing
              orders keep the shop name.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmingDelete(false)
                handleDeleteShop()
              }}
            >
              Delete shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation active="shops" />
    </main>
  )
}

function ShopDetail({
  shop,
  editing,
  editDraft,
  productDraft,
  busy,
  photoUrls,
  photoExpiry,
  isPro,
  account,
  onKeepPhotos,
  errorMessage,
  savedMessage,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onProductChange,
  onAddProduct,
  onRemoveProduct,
}: {
  shop: LocalShop
  editing: boolean
  editDraft: ShopDraft
  productDraft: ProductDraft
  busy: boolean
  photoUrls: Record<string, string>
  photoExpiry: Record<string, string>
  isPro: boolean
  account: ProfileSettings | null
  onKeepPhotos: () => void
  errorMessage: string
  savedMessage: string
  onEditChange: (key: keyof ShopDraft, value: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => void
  onDelete: () => void
  onProductChange: (key: keyof ProductDraft, value: string) => void
  onAddProduct: (event: FormEvent<HTMLFormElement>) => void
  onRemoveProduct: (product: LocalShopProduct) => void
}) {
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle className="truncate font-heading text-xl">
          {shop.name}
        </SheetTitle>
        <SheetDescription>
          {shop.products.length} product{shop.products.length === 1 ? "" : "s"}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 p-4">
        {errorMessage ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {savedMessage ? (
          <Alert className="rounded-xl">
            <AlertDescription>{savedMessage}</AlertDescription>
          </Alert>
        ) : null}

        {editing ? (
          <form onSubmit={onSaveEdit} className="space-y-4">
            <TextInput
              id="editShopName"
              label="Shop name"
              value={editDraft.name}
              onChange={(value) => onEditChange("name", value)}
              required
            />
            <TextInput
              id="editShopOwner"
              label="Contact name (optional)"
              value={editDraft.ownerName}
              onChange={(value) => onEditChange("ownerName", value)}
            />
            <TextInput
              id="editShopPhone"
              label="Phone or LINE"
              value={editDraft.phone}
              onChange={(value) => onEditChange("phone", value)}
              required
            />
            <div className="space-y-2">
              <Label htmlFor="editShopLocation">Location</Label>
              <Textarea
                id="editShopLocation"
                value={editDraft.location}
                onChange={(event) => onEditChange("location", event.target.value)}
                required
                className="min-h-24 rounded-xl text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editShopNote">Shop info (optional)</Label>
              <Textarea
                id="editShopNote"
                value={editDraft.note}
                onChange={(event) => onEditChange("note", event.target.value)}
                className="min-h-24 rounded-xl text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={onCancelEdit}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-xl" disabled={busy}>
                {busy ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {shop.ownerName ? (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <IconUser className="size-4" />
                  {shop.ownerName}
                </p>
              ) : null}
              {shop.phone ? (
                <p className="text-sm text-muted-foreground">{shop.phone}</p>
              ) : null}
              {shop.location ? (
                <p className="flex items-start gap-1 text-sm text-muted-foreground">
                  <IconMapPin className="mt-0.5 size-4 shrink-0" />
                  <span>{shop.location}</span>
                </p>
              ) : null}
              {shop.note ? (
                <p className="whitespace-pre-wrap text-sm">{shop.note}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={onStartEdit}
              >
                <IconPencil className="mr-2 size-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <IconTrash className="mr-2 size-4" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {shop.products.some((product) => product.imagePath) ? (
          <div className="space-y-2 rounded-2xl border p-3">
            <p className="text-sm text-muted-foreground">
              Product photos are deleted 7 days after they are saved.
              {isPro ? null : (
                <>
                  {" "}
                  Pro accounts can keep them for a month. To upgrade, contact{" "}
                  <UpgradeLink account={account ?? undefined} />.
                </>
              )}
            </p>
            {isPro ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl"
                disabled={busy}
                onClick={onKeepPhotos}
              >
                {busy ? "Saving..." : "Keep photos for a month"}
              </Button>
            ) : null}
          </div>
        ) : null}

        {shop.products.length > 0 ? (
          <div className="space-y-3 rounded-2xl border bg-muted/40 p-3">
            {shop.products.map((product) => (
              <div key={product.id} className="flex items-start gap-3 text-sm">
                {product.imagePath && photoUrls[product.imagePath] ? (
                  <Image
                    src={photoUrls[product.imagePath!]}
                    alt={product.name}
                    width={56}
                    height={56}
                    unoptimized
                    className="size-14 shrink-0 rounded-xl border object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border bg-background">
                    <IconPhoto className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  {product.note ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                      {product.note}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-muted-foreground">
                    {formatBaht(product.priceThb)}
                  </p>
                  {product.imagePath && photoExpiry[product.imagePath] ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Photo kept until{" "}
                      {new Date(photoExpiry[product.imagePath]).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-lg text-muted-foreground"
                  aria-label={`Remove ${product.name}`}
                  onClick={() => onRemoveProduct(product)}
                >
                  <IconTrash className="size-4" />
                </Button>
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
            id="productName"
            label="Product name"
            value={productDraft.name}
            onChange={(value) => onProductChange("name", value)}
            placeholder="Dress, shoes, bag"
            required
          />
          <ProductImageInput
            id="productImage"
            value={productDraft.imageDataUrl}
            onChange={(value) => onProductChange("imageDataUrl", value)}
          />
          <TextInput
            id="productPrice"
            label="Price THB"
            value={productDraft.priceThb}
            onChange={(value) => onProductChange("priceThb", value)}
            placeholder="0"
            type="number"
          />
          <div className="space-y-2">
            <Label htmlFor="productNote">Variants (color, size)</Label>
            <Textarea
              id="productNote"
              value={productDraft.note}
              onChange={(event) => onProductChange("note", event.target.value)}
              placeholder="Black, White / S, M, L"
              className="min-h-20 rounded-xl text-base"
            />
          </div>
          <Button type="submit" variant="outline" className="h-11 w-full rounded-xl" disabled={busy}>
            <IconPlus className="mr-2 size-5" />
            {busy ? "Saving..." : "Add Product"}
          </Button>
        </form>
      </div>
    </>
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

function ProductImageInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  const [error, setError] = useState("")

  async function handleFile(file: File | undefined) {
    if (!file) return

    setError("")

    try {
      onChange(await resizeImageToDataUrl(file))
    } catch {
      setError("Could not read this image. Try a JPG or PNG photo.")
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Product photo</Label>

      {value ? (
        <div className="relative w-fit">
          <Image
            src={value}
            alt="Product preview"
            width={112}
            height={112}
            unoptimized
            className="size-28 rounded-xl border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -right-2 -top-2 size-7 rounded-full"
            aria-label="Remove photo"
            onClick={() => onChange("")}
          >
            <IconX className="size-4" />
          </Button>
        </div>
      ) : null}

      <Input
        id={id}
        type="file"
        accept="image/*"
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          event.target.value = ""
        }}
        className="h-12 rounded-xl text-base"
      />

      <p className="text-xs text-muted-foreground">
        Photos are deleted 7 days after they are saved.
      </p>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
