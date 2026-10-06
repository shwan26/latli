// app/orders/[id]/page.tsx

"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconBuildingStore,
  IconCamera,
  IconDeviceFloppy,
  IconMessage2,
  IconTruck,
  IconTruckDelivery,
  IconUser,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type LocalOrder,
} from "../../lib/local-orders"
import { getOrder, updateOrder } from "@/lib/db/orders"
import { listCargo } from "@/lib/db/cargo"
import { insertProduct, insertShop, listShops } from "@/lib/db/shops"
import { OrderProductFields, type ProductMode } from "@/components/order-product-fields"
import { SearchPicker } from "@/components/search-picker"
import type {
  LocalCargoCompany,
  LocalShop,
  LocalShopProduct,
} from "../../lib/local-shops"
import {
  getPhotoExpiry,
  getPhotoUrls,
  keepPhotosLonger,
  removePhotos,
  uploadPhoto,
} from "@/lib/db/photos"
import { FieldError, RequiredMark } from "@/components/field-error"
import { UpgradeLink } from "@/components/upgrade-link"
import { focusFirstError } from "@/lib/form-errors"
import { fetchProfile, type ProfileSettings } from "@/lib/profile"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { messageOf } from "@/lib/db/shared"
import { resizeImageToDataUrl } from "../../lib/image-resize"
import { formatMoney } from "../../lib/currency"
import { useI18n } from "@/lib/i18n/provider"
import { dateLocale, translate } from "@/lib/i18n/runtime"
import { RichText } from "@/components/rich-text"

function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

// Required fields from top to bottom, for moving to the first problem.
const FIELD_ORDER = [
  "customerName",
  "productName",
  "productSize",
  "quantity",
  "costPriceThb",
  "sellingPriceThb",
]

export default function OrderDetailsPage() {
  const { t } = useI18n()

  const router = useRouter()
  const params = useParams<{ id: string }>()
  const orderId = params.id

  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<LocalOrder | null>(null)

  const [customerName, setCustomerName] = useState("")
  const [facebookName, setFacebookName] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [productName, setProductName] = useState("")
  const [productSize, setProductSize] = useState("")
  const [productColor, setProductColor] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [costPriceThb, setCostPriceThb] = useState("0")
  const [sellingPriceThb, setSellingPriceThb] = useState("0")
  const [customerMessage, setCustomerMessage] = useState("")
  const [paymentStatus, setPaymentStatus] =
    useState<LocalOrder["paymentStatus"]>("not_paid")
  const [orderStatus, setOrderStatus] =
    useState<LocalOrder["orderStatus"]>("not_bought")
  // Newly chosen photos (data URLs) waiting to be uploaded on save.
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState("")
  const [newPhotoName, setNewPhotoName] = useState("")
  const [newScreenshotDataUrl, setNewScreenshotDataUrl] = useState("")
  const [savedPhotoUrl, setSavedPhotoUrl] = useState("")
  const [savedScreenshotUrl, setSavedScreenshotUrl] = useState("")
  const [shops, setShops] = useState<LocalShop[]>([])
  const [cargoCompanies, setCargoCompanies] = useState<LocalCargoCompany[]>([])
  const [selectedCargoId, setSelectedCargoId] = useState("")
  const [cargoCleared, setCargoCleared] = useState(false)
  const [shopMode, setShopMode] = useState<"existing" | "new">("existing")
  const [selectedShopId, setSelectedShopId] = useState("")
  const [newShopName, setNewShopName] = useState("")
  const [newShopPhone, setNewShopPhone] = useState("")
  const [newShopLocation, setNewShopLocation] = useState("")
  const [productMode, setProductMode] = useState<ProductMode>("new")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [photoExpiresAt, setPhotoExpiresAt] = useState("")
  const [isPro, setIsPro] = useState(false)
  const [account, setAccount] = useState<ProfileSettings | null>(null)
  const [keeping, setKeeping] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const storedOrder = await getOrder(orderId)

        if (cancelled) return

        setOrder(storedOrder)

        if (storedOrder) {
          setCustomerName(storedOrder.customerName || "")
          setFacebookName(storedOrder.facebookName || "")
          setPhone(storedOrder.phone || "")
          setLocation(storedOrder.address || "")
          setProductName(storedOrder.productName || "")
          setProductSize(storedOrder.productSize || "")
          setProductColor(storedOrder.productColor || "")
          setProductDescription(storedOrder.productDescription || "")
          setQuantity(String(storedOrder.quantity || 1))
          setCostPriceThb(String(storedOrder.retailerUnitPriceThb || 0))
          setSellingPriceThb(String(storedOrder.sellingUnitPriceThb || 0))
          setCustomerMessage(storedOrder.customerMessageBurmese || "")
          setPaymentStatus(storedOrder.paymentStatus)
          setOrderStatus(storedOrder.orderStatus)

          const [urls, expiry, profile, loadedShops, loadedCargo] = await Promise.all([
            getPhotoUrls([
              storedOrder.productPhotoPath,
              storedOrder.orderScreenshotPath,
            ]),
            getPhotoExpiry([
              storedOrder.productPhotoPath,
              storedOrder.orderScreenshotPath,
            ]),
            isSupabaseConfigured ? fetchProfile(createClient()) : null,
            listShops(),
            listCargo(),
          ])

          if (cancelled) return

          const orderShop = storedOrder.retailerName?.trim().toLowerCase()
          const matched = loadedShops.find(
            (shop) => shop.name.trim().toLowerCase() === orderShop
          )

          setShops(loadedShops)
          setCargoCompanies(loadedCargo)

          const orderCargo = storedOrder.cargoName?.trim().toLowerCase()

          setSelectedCargoId(
            loadedCargo.find(
              (company) => company.name.trim().toLowerCase() === orderCargo
            )?.id ?? ""
          )

          if (matched) {
            setSelectedShopId(matched.id)
          } else if (storedOrder.retailerName?.trim() || loadedShops.length === 0) {
            setShopMode("new")
            setNewShopName(storedOrder.retailerName?.trim() ?? "")
          }

          if (storedOrder.productPhotoPath) {
            setSavedPhotoUrl(urls[storedOrder.productPhotoPath] ?? "")
          }

          if (storedOrder.orderScreenshotPath) {
            setSavedScreenshotUrl(urls[storedOrder.orderScreenshotPath] ?? "")
          }

          setIsPro(profile?.plan === "pro")
          setAccount(profile)
          // Show the earliest date, since that is when the first photo goes.
          setPhotoExpiresAt(Object.values(expiry).sort()[0] ?? "")
        }
      } catch (loadError) {
        if (!cancelled) setError(messageOf(loadError, translate("Could not load the order.")))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [orderId])

  function clearFieldError(id: string) {
    setFieldErrors((current) => {
      if (!current[id]) return current

      const next = { ...current }

      delete next[id]

      return next
    })
  }

  async function handleProductPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("")

    const file = event.target.files?.[0] ?? null

    if (!file) {
      setNewPhotoDataUrl("")
      setNewPhotoName("")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError(t("Please upload an image."))
      event.target.value = ""
      return
    }

    try {
      setNewPhotoDataUrl(await resizeImageToDataUrl(file, 1600, 0.8))
      setNewPhotoName(file.name)
    } catch {
      setError(t("Could not preview the image. Please choose another image."))
      event.target.value = ""
    }
  }

  async function handleScreenshotChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("")

    const file = event.target.files?.[0] ?? null

    if (!file) {
      setNewScreenshotDataUrl("")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError(t("Please upload an image."))
      event.target.value = ""
      return
    }

    try {
      setNewScreenshotDataUrl(await resizeImageToDataUrl(file, 1600, 0.8))
    } catch {
      setError(t("Could not preview the image. Please choose another image."))
      event.target.value = ""
    }
  }

  async function pickProduct(product: LocalShopProduct) {
    setSelectedProductId(product.id)
    setProductName(product.name)
    setProductSize(product.note)
    setCostPriceThb(String(product.priceThb || 0))
    setNewPhotoDataUrl("")
    setNewPhotoName("")

    if (product.imagePath) {
      try {
        const urls = await getPhotoUrls([product.imagePath])

        setSavedPhotoUrl(urls[product.imagePath] ?? "")
      } catch {
        // The photo is only a preview.
      }
    }
  }

  function chooseShop(id: string) {
    setSelectedShopId(id)
    setSelectedProductId("")
    setProductMode("new")
  }

  async function handleKeepPhotos() {
    if (!order) return

    setError("")
    setKeeping(true)

    try {
      setPhotoExpiresAt(
        await keepPhotosLonger([order.productPhotoPath, order.orderScreenshotPath])
      )
    } catch (keepError) {
      setError(messageOf(keepError, t("Could not keep the photos longer.")))
    } finally {
      setKeeping(false)
    }
  }

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (!order) {
      setError(t("Order could not be found."))
      return
    }

    const trimmedSize = productSize.trim()
    const quantityNumber = Number(quantity.trim())

    // Check every required field at once, so all problems show together.
    const problems: Record<string, string> = {}

    if (!customerName.trim()) problems.customerName = t("Enter the customer's name.")
    if (!productName.trim()) problems.productName = t("Enter the product name.")
    if (!trimmedSize) problems.productSize = t("Enter the size or variant.")

    if (!quantity.trim() || !Number.isInteger(quantityNumber) || quantityNumber < 1) {
      problems.quantity = t("Quantity must be at least 1.")
    }

    if (costPriceThb.trim() === "" || !(Number(costPriceThb) >= 0)) {
      problems.costPriceThb = t("Enter the cost price.")
    }

    if (sellingPriceThb.trim() === "" || !(Number(sellingPriceThb) > 0)) {
      problems.sellingPriceThb = t("Enter a selling price above 0.")
    }

    setFieldErrors(problems)

    if (Object.keys(problems).length > 0) {
      setError(t("Please fill in the fields marked in red."))
      focusFirstError(FIELD_ORDER, problems)
      return
    }

    // A cargo name that is no longer in the cargo list is kept as it was.
    const cargoName = selectedCargoId
      ? (cargoCompanies.find((company) => company.id === selectedCargoId)?.name ?? "")
      : cargoCleared
        ? ""
        : (order.cargoName ?? "")

    setSaving(true)

    const uploadedPaths: string[] = []
    let productPhotoPath = order.productPhotoPath
    let screenshotPath = order.orderScreenshotPath
    const replacedPaths: (string | undefined)[] = []
    let productImagePath: string | undefined

    // Shop: a saved one, or a typed name (saved to the shop list if new).
    let shopName = ""
    let shopId = ""
    let newShop: { name: string; phone: string; location: string } | null = null

    if (shopMode === "existing") {
      const chosen = shops.find((shop) => shop.id === selectedShopId)

      shopName = chosen?.name ?? ""
      shopId = chosen?.id ?? ""
    } else if (newShopName.trim()) {
      shopName = newShopName.trim()

      const sameName = shops.find(
        (shop) => shop.name.trim().toLowerCase() === shopName.toLowerCase()
      )

      if (sameName) {
        shopName = sameName.name
        shopId = sameName.id
      } else {
        newShop = {
          name: shopName,
          phone: newShopPhone.trim(),
          location: newShopLocation.trim(),
        }
      }
    }

    const shopProducts = shops.find((shop) => shop.id === shopId)?.products ?? []
    const productChanged =
      newShop !== null ||
      newPhotoDataUrl !== "" ||
      productName.trim() !== (order.productName ?? "")
    const linkProduct =
      productChanged &&
      !shopProducts.some(
        (product) =>
          product.name.trim().toLowerCase() === productName.trim().toLowerCase()
      )

    try {
      const costPriceNumber = toNumber(costPriceThb)
      const sellingPriceNumber = toNumber(sellingPriceThb)
      const totalRetailerCostThb = costPriceNumber * quantityNumber
      const totalCustomerPayableThb = sellingPriceNumber * quantityNumber
      const totalPaidThb =
        paymentStatus === "fully_paid"
          ? totalCustomerPayableThb
          : paymentStatus === "not_paid"
            ? 0
            : Math.min(order.totalPaidThb || 0, totalCustomerPayableThb)
      const remainingBalanceThb = Math.max(
        totalCustomerPayableThb - totalPaidThb,
        0
      )

      if (newPhotoDataUrl) {
        productPhotoPath = await uploadPhoto(newPhotoDataUrl, "orders")
        uploadedPaths.push(productPhotoPath)
        replacedPaths.push(order.productPhotoPath)

        if (linkProduct) {
          productImagePath = await uploadPhoto(newPhotoDataUrl, "products")
          uploadedPaths.push(productImagePath)
        }
      }

      if (newScreenshotDataUrl) {
        screenshotPath = await uploadPhoto(newScreenshotDataUrl, "orders")
        uploadedPaths.push(screenshotPath)
        replacedPaths.push(order.orderScreenshotPath)
      }

      const updatedOrder = await updateOrder({
        ...order,
        customerName: customerName.trim() || "Customer order",
        facebookName: facebookName.trim(),
        phone: phone.trim(),
        address: location.trim(),
        orderStatus,
        paymentStatus,
        totalRetailerCostThb,
        totalCustomerPayableThb,
        totalPaidThb,
        remainingBalanceThb,
        profitThb: totalCustomerPayableThb - totalRetailerCostThb,
        customerMessageBurmese: customerMessage.trim(),
        productName: productName.trim() || "Product photo order",
        quantity: quantityNumber,
        productSize: trimmedSize,
        productOption: trimmedSize,
        productColor: productColor.trim(),
        productDescription: productDescription.trim(),
        productNote: productDescription.trim(),
        retailerUnitPriceThb: costPriceNumber,
        sellingUnitPriceThb: sellingPriceNumber,
        retailerName: shopName,
        cargoName: cargoName,
        productPhotoName: newPhotoDataUrl ? newPhotoName : order.productPhotoName,
        productPhotoPath,
        orderScreenshotPath: screenshotPath,
      })

      // The replaced photos are no longer used.
      await removePhotos(replacedPaths)

      // The order is saved. Saving the shop or product record is best effort.
      try {
        if (newShop) {
          shopId = (
            await insertShop({ ...newShop, ownerName: "", note: "" })
          ).id
        }

        if (shopId && linkProduct && productName.trim()) {
          await insertProduct(shopId, {
            name: productName.trim(),
            priceThb: costPriceNumber,
            note: trimmedSize,
            imagePath: productImagePath,
          })
        }
      } catch {
        await removePhotos([productImagePath])
      }

      setOrder(updatedOrder)
      router.push("/orders")
    } catch (saveError) {
      await removePhotos(uploadedPaths)
      setError(messageOf(saveError, t("Could not save the order. Please try again.")))
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">{t("Loading order...")}</p>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/orders">
              <IconArrowLeft className="mr-2 size-5" />{t("Back to orders")}</Link>
          </Button>
          <Card className="rounded-[20px] shadow-none">
            <CardContent className="p-6 text-center">
              <h1 className="font-heading text-xl font-medium">{t("Order not found")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("This order may have been deleted.")}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-28">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/orders" aria-label={t("Back to orders")}>
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">
              {order.orderNumber}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Order Details")}</h1>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSaveOrder}
        className="mx-auto w-full max-w-md space-y-5 px-5 pb-40 pt-5"
      >
        <p className="text-xs text-muted-foreground">
          <RequiredMark /> {t("required")}
        </p>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconCamera className="size-5 text-muted-foreground" />{t("Chat Screenshot")}</CardTitle>
            <CardDescription>{t("View or replace the customer chat screenshot.")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              className="rounded-xl"
              onChange={handleScreenshotChange}
            />

            {newScreenshotDataUrl || savedScreenshotUrl ? (
              <div className="overflow-hidden rounded-2xl border bg-background">
                <Image
                  src={newScreenshotDataUrl || savedScreenshotUrl}
                  alt={t("Original order screenshot")}
                  width={800}
                  height={1200}
                  unoptimized
                  className="max-h-96 w-full object-contain"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-background p-6 text-center">
                <IconCamera className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  {order.orderScreenshotPath
                    ? t("This photo expired and was deleted")
                    : t("No screenshot")}
                </p>
              </div>
            )}

            {order.productPhotoPath || order.orderScreenshotPath ? (
              <div className="space-y-2 rounded-xl border bg-background p-3">
                <p className="text-sm">
                  {photoExpiresAt
                    ? t("Photos are deleted on {date}.", {
                        date: new Date(photoExpiresAt).toLocaleDateString(dateLocale(), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }),
                      })
                    : t("Photos are deleted 7 days after they are saved.")}
                </p>
                {isPro ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl"
                    disabled={keeping}
                    onClick={handleKeepPhotos}
                  >
                    {keeping ? t("Saving...") : t("Keep photos for a month")}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <RichText text={t("Pro accounts can keep photos for a month. To upgrade, contact {email}.")} parts={{ email: <UpgradeLink account={account ?? undefined} /> }} />
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconUser className="size-5 text-muted-foreground" />{t("Customer Info")}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <TextInput
              id="customerName"
              label={t("Customer name")}
              value={customerName}
              onChange={(value) => {
                setCustomerName(value)
                clearFieldError("customerName")
              }}
              required
              error={fieldErrors.customerName}
              placeholder={t("Customer name")}
            />
            <TextInput
              id="facebookName"
              label={t("Facebook name")}
              value={facebookName}
              onChange={setFacebookName}
              placeholder={t("Facebook display name")}
            />
            <TextInput
              id="phone"
              label={t("Phone number")}
              value={phone}
              onChange={setPhone}
              placeholder={t("Phone number")}
            />
            <div className="space-y-2">
              <Label htmlFor="location">{t("Location")}</Label>
              <Textarea
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t("Customer delivery location")}
                className="min-h-24 rounded-xl text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconBuildingStore className="size-5 text-muted-foreground" />{t("Shop")}</CardTitle>
            <CardDescription>{t("Where this product will be bought.")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={shopMode === "existing" ? "default" : "outline"}
                className="h-11 rounded-xl"
                aria-pressed={shopMode === "existing"}
                onClick={() => setShopMode("existing")}
              >
                {t("Saved shop")}
              </Button>
              <Button
                type="button"
                variant={shopMode === "new" ? "default" : "outline"}
                className="h-11 rounded-xl"
                aria-pressed={shopMode === "new"}
                onClick={() => setShopMode("new")}
              >
                {t("New shop")}
              </Button>
            </div>

            {shopMode === "existing" ? (
              <SearchPicker
                id="shopPicker"
                items={shops
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((shop) => ({
                    value: shop.id,
                    label: shop.name,
                    description: shop.location || undefined,
                  }))}
                value={selectedShopId}
                onChange={chooseShop}
                placeholder={t("Choose a shop")}
                searchPlaceholder={t("Search shop or location")}
                emptyText={t("No saved shops match.")}
              />
            ) : (
              <div className="space-y-4">
                <TextInput
                  id="newShopName"
                  label={t("Shop name")}
                  value={newShopName}
                  onChange={setNewShopName}
                  placeholder={t("Bangkok shop")}
                />
                <TextInput
                  id="newShopPhone"
                  label={t("Phone or LINE (optional)")}
                  value={newShopPhone}
                  onChange={setNewShopPhone}
                  placeholder={t("Phone number or LINE ID")}
                />
                <TextInput
                  id="newShopLocation"
                  label={t("Location (optional)")}
                  value={newShopLocation}
                  onChange={setNewShopLocation}
                  placeholder={t("Shop address, mall, or market")}
                />
                <p className="text-xs text-muted-foreground">{t("The shop is saved to your shop list with this order.")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconMessage2 className="size-5 text-muted-foreground" />{t("Product Info")}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <OrderProductFields
              products={
                shopMode === "existing"
                  ? (shops.find((shop) => shop.id === selectedShopId)?.products ?? [])
                  : []
              }
              mode={productMode}
              onModeChange={setProductMode}
              productId={selectedProductId}
              onPickProduct={pickProduct}
              photoPreview={newPhotoDataUrl || savedPhotoUrl}
              onPhotoChange={handleProductPhotoChange}
              photoLabel={t("Product photo (optional)")}
            />

            <TextInput
              id="productName"
              label={t("Product name")}
              value={productName}
              onChange={(value) => {
                setProductName(value)
                clearFieldError("productName")
              }}
              required
              error={fieldErrors.productName}
              placeholder={t("Product name")}
            />
            <div className="space-y-2">
              <Label htmlFor="productDescription">{t("Description")}</Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder={t("Product description")}
                className="min-h-24 rounded-xl text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                id="productSize"
                label={t("Size / variant")}
                value={productSize}
                onChange={(value) => {
                setProductSize(value)
                clearFieldError("productSize")
              }}
              required
              error={fieldErrors.productSize}
                placeholder={t("XS, 42, L...")}
              />
              <TextInput
                id="productColor"
                label={t("Color")}
                value={productColor}
                onChange={setProductColor}
                placeholder={t("White, black...")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                id="quantity"
                label={t("Quantity")}
                value={quantity}
                onChange={(value) => {
                setQuantity(value)
                clearFieldError("quantity")
              }}
              required
              error={fieldErrors.quantity}
                type="number"
                placeholder="1"
              />
              <TextInput
                id="costPriceThb"
                label={t("Cost price (฿)").replace("฿", order.baseCurrency)}
                value={costPriceThb}
                onChange={(value) => {
                setCostPriceThb(value)
                clearFieldError("costPriceThb")
              }}
              required
              error={fieldErrors.costPriceThb}
                type="number"
                placeholder="0"
              />
            </div>
            <TextInput
              id="sellingPriceThb"
              label={t("Selling price (฿)").replace("฿", order.baseCurrency)}
              value={sellingPriceThb}
              onChange={(value) => {
                setSellingPriceThb(value)
                clearFieldError("sellingPriceThb")
              }}
              required
              error={fieldErrors.sellingPriceThb}
              type="number"
              placeholder="0"
            />
            <div className="rounded-2xl bg-muted p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryItem
                  label={t("Customer total")}
                  value={formatMoney(
                    toNumber(sellingPriceThb) * toNumber(quantity),
                    order.baseCurrency
                  )}
                />
                <SummaryItem
                  label={t("Profit")}
                  value={formatMoney(
                    (toNumber(sellingPriceThb) - toNumber(costPriceThb)) *
                      toNumber(quantity),
                    order.baseCurrency
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerMessage">{t("Customer note")}</Label>
              <Textarea
                id="customerMessage"
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                placeholder={t("Optional note")}
                className="min-h-24 rounded-xl text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconTruck className="size-5 text-muted-foreground" />{t("Cargo")}</CardTitle>
            <CardDescription>{t("Optional. The cargo company that carries this order.")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {cargoCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <Link href="/cargo" className="font-medium underline">
                  {t("Add a cargo company")}
                </Link>
              </p>
            ) : (
              <SearchPicker
                id="cargoPicker"
                items={cargoCompanies
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((company) => ({
                    value: company.id,
                    label: company.name,
                    description: company.phone || undefined,
                  }))}
                value={selectedCargoId}
                onChange={(value) => {
                  setSelectedCargoId(value)
                  setCargoCleared(false)
                }}
                placeholder={t("Choose a cargo company")}
                searchPlaceholder={t("Search cargo")}
                emptyText={t("No saved cargo match.")}
              />
            )}

            {!selectedCargoId && order.cargoName && !cargoCleared ? (
              <p className="text-sm text-muted-foreground">
                {t("Cargo: {name} (not in your cargo list)", { name: order.cargoName })}
              </p>
            ) : null}

            {selectedCargoId || (order.cargoName && !cargoCleared) ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl"
                onClick={() => {
                  setSelectedCargoId("")
                  setCargoCleared(true)
                }}
              >
                {t("No cargo")}
              </Button>
            ) : null}

            {orderStatus === "sent_cargo" && !selectedCargoId && !order.cargoName ? (
              <p className="text-xs text-muted-foreground">{t("Choose the cargo company")}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconTruckDelivery className="size-5 text-muted-foreground" />{t("Status")}</CardTitle>
            <CardDescription>{t("Update payment and order progress.")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <StatusSelect
              label={t("Payment status")}
              value={paymentStatus}
              onChange={(value) =>
                setPaymentStatus(value as LocalOrder["paymentStatus"])
              }
              items={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => [value, t(label)] as [string, string])}
            />
            <StatusSelect
              label={t("Order status")}
              value={orderStatus}
              onChange={(value) =>
                setOrderStatus(value as LocalOrder["orderStatus"])
              }
              items={Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => [value, t(label)] as [string, string])}
            />
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-5 pb-5 pt-3 backdrop-blur">
          {error ? (
            <p
              role="alert"
              className="mx-auto mb-2 w-full max-w-md text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="mx-auto flex w-full max-w-md gap-3">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-xl">
              <Link href="/orders">{t("Cancel")}</Link>
            </Button>

            <Button
              type="submit"
              className="h-12 flex-1 rounded-xl"
              disabled={saving}
            >
              <IconDeviceFloppy className="mr-2 size-5" />
              {saving ? t("Saving...") : t("Save")}
            </Button>
          </div>
        </div>
      </form>
    </main>
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
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-12 rounded-xl text-base"
      />
      <FieldError id={id} message={error} />
    </div>
  )
}

function StatusSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  items: [string, string][]
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(([itemValue, itemLabel]) => (
            <SelectItem key={itemValue} value={itemValue}>
              {itemLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
