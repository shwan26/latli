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
  IconTrash,
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
import { Textarea } from "@/components/ui/textarea"
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type LocalOrder,
} from "../../lib/local-orders"
import { deleteOrder, getOrder, updateOrder } from "@/lib/db/orders"
import { listCargo } from "@/lib/db/cargo"
import { insertCustomer, listCustomers, updateCustomer } from "@/lib/db/customers"
import { getCustomerKey, type LocalCustomer } from "../../lib/local-customers"
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
import { photoSizeFor, resizeImageToDataUrl } from "../../lib/image-resize"
import { formatAmount } from "../../lib/currency"
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
  "costPrice",
  "sellingPrice",
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
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [order, setOrder] = useState<LocalOrder | null>(null)

  const [customerName, setCustomerName] = useState("")
  const [facebookName, setFacebookName] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [productName, setProductName] = useState("")
  const [productSize, setProductSize] = useState("")
  const [productVariant, setProductVariant] = useState("")
  const [productColor, setProductColor] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [costPrice, setCostPrice] = useState("0")
  const [sellingPrice, setSellingPrice] = useState("0")
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
  const [customers, setCustomers] = useState<LocalCustomer[]>([])
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
  const photo = photoSizeFor(isPro)
  // A product of the chosen shop with this name: its price is changed on the
  // product, not on the order.
  const priceLockedProduct = (
    shopMode === "existing"
      ? (shops.find((shop) => shop.id === selectedShopId)?.products ?? [])
      : []
  ).find(
    (product) =>
      product.name.trim().toLowerCase() === productName.trim().toLowerCase()
  )
  const priceLocked = !!priceLockedProduct
  const [account, setAccount] = useState<ProfileSettings | null>(null)

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
          setProductSize(storedOrder.productDetails?.size || "")
          setProductVariant(storedOrder.productDetails?.variant || "")
          setProductColor(storedOrder.productDetails?.color || "")
          setQuantity(String(storedOrder.quantity || 1))
          // The price per item this order was made with.
          setCostPrice(
            String(
              storedOrder.quantity
                ? storedOrder.totalRetailerPrice / storedOrder.quantity
                : 0
            )
          )
          setSellingPrice(String(storedOrder.totalSellingPrice || 0))
          setCustomerMessage(storedOrder.customerMessageBurmese || "")
          setPaymentStatus(storedOrder.paymentStatus)
          setOrderStatus(storedOrder.orderStatus)

          const [urls, expiry, profile, loadedShops, loadedCargo, loadedCustomers] = await Promise.all([
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
            listCustomers(),
          ])

          if (cancelled) return

          setShops(loadedShops)
          setCargoCompanies(loadedCargo)
          setCustomers(loadedCustomers)
          setSelectedCargoId(storedOrder.cargoId ?? "")

          if (storedOrder.shopId) {
            setSelectedShopId(storedOrder.shopId)
          } else if (loadedShops.length === 0) {
            setShopMode("new")
          }

          if (storedOrder.productId) setSelectedProductId(storedOrder.productId)

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
        if (!cancelled) setError(messageOf(loadError, translate("Could not load the order")))
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
      setError(t("Please upload an image"))
      event.target.value = ""
      return
    }

    try {
      setNewPhotoDataUrl(await resizeImageToDataUrl(file, photo.maxSide, photo.quality))
      setNewPhotoName(file.name)
    } catch {
      setError(t("Could not preview the image. Please choose another image"))
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
      setError(t("Please upload an image"))
      event.target.value = ""
      return
    }

    try {
      setNewScreenshotDataUrl(await resizeImageToDataUrl(file, photo.maxSide, photo.quality))
    } catch {
      setError(t("Could not preview the image. Please choose another image"))
      event.target.value = ""
    }
  }

  async function pickProduct(product: LocalShopProduct) {
    setSelectedProductId(product.id)
    setProductName(product.name)
    setProductSize(product.size)
    setProductVariant(product.variant)
    setProductColor(product.color)
    setCostPrice(String(product.price || 0))
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

  async function handleDelete() {
    if (!order) return

    setConfirmingDelete(false)

    try {
      await deleteOrder(order)
    } catch (deleteError) {
      setError(messageOf(deleteError, t("Could not delete the order")))
      return
    }

    router.push("/orders")
  }

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (!order) {
      setError(t("Order could not be found"))
      return
    }

    const trimmedSize = productSize.trim()
    const trimmedVariant = productVariant.trim()
    const trimmedColor = productColor.trim()
    const quantityNumber = Number(quantity.trim())

    // Check every required field at once, so all problems show together.
    const problems: Record<string, string> = {}

    if (!customerName.trim()) problems.customerName = t("Enter the customer's name")
    if (!productName.trim()) problems.productName = t("Enter the product name")

    if (!quantity.trim() || !Number.isInteger(quantityNumber) || quantityNumber < 1) {
      problems.quantity = t("Quantity must be at least 1")
    }

    if (costPrice.trim() === "" || !(Number(costPrice) >= 0)) {
      problems.costPrice = t("Enter the cost price")
    }

    if (sellingPrice.trim() === "" || !(Number(sellingPrice) > 0)) {
      problems.sellingPrice = t("Enter a total selling price above 0")
    }

    setFieldErrors(problems)

    if (Object.keys(problems).length > 0) {
      setError(t("Please fill in the fields marked in red"))
      focusFirstError(FIELD_ORDER, problems)
      return
    }

    const cargoId = selectedCargoId || (cargoCleared ? undefined : order.cargoId)

    setSaving(true)

    const uploadedPaths: string[] = []
    let productPhotoPath = order.productPhotoPath
    let screenshotPath = order.orderScreenshotPath
    const replacedPaths: (string | undefined)[] = []
    let productImagePath: string | undefined

    // Shop: a saved one, or a typed name (saved to the shop list if new).
    let shopId = ""
    let newShop: { name: string; phone: string; location: string } | null = null

    if (shopMode === "existing") {
      shopId = shops.find((shop) => shop.id === selectedShopId)?.id ?? ""
    } else if (newShopName.trim()) {
      const shopName = newShopName.trim()

      const sameName = shops.find(
        (shop) => shop.name.trim().toLowerCase() === shopName.toLowerCase()
      )

      if (sameName) {
        shopId = sameName.id
      } else {
        newShop = {
          name: shopName,
          phone: newShopPhone.trim(),
          location: newShopLocation.trim(),
        }
      }
    }

    // The order points to a product of its shop. A product with this name is
    // reused; otherwise a new one is created below.
    const shopProducts = shops.find((shop) => shop.id === shopId)?.products ?? []
    const sameNameProduct = shopProducts.find(
      (product) =>
        product.name.trim().toLowerCase() === productName.trim().toLowerCase()
    )
    let productId = sameNameProduct?.id
    const linkProduct = !productId && productName.trim() !== ""
    let productRowSaved = false

    try {
      const costPriceNumber = toNumber(costPrice)
      const sellingPriceNumber = toNumber(sellingPrice)
      // A saved product keeps its own price. An unchanged order keeps the
      // total it was made with, even if the product price changed since.
      const totalRetailerPrice =
        sameNameProduct?.id === order.productId && quantityNumber === order.quantity
          ? order.totalRetailerPrice
          : (sameNameProduct ? sameNameProduct.price : costPriceNumber) * quantityNumber

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

      // The customer details belong to the customer record, which every order
      // of that customer shows. Editing them here edits the record.
      const customerInput = {
        name: customerName.trim() || "Customer order",
        facebookName: facebookName.trim(),
        phone: phone.trim(),
        address: location.trim(),
        otherContacts:
          customers.find((customer) => customer.id === order.customerId)
            ?.otherContacts ?? "",
      }
      const customerKey = getCustomerKey(customerInput)
      const savedCustomer = customers.find((customer) => customer.id === order.customerId)
      let customerId = order.customerId

      if (savedCustomer) {
        const changed =
          customerInput.name !== savedCustomer.name ||
          customerInput.facebookName !== savedCustomer.facebookName ||
          customerInput.phone !== savedCustomer.phone ||
          customerInput.address !== savedCustomer.address

        if (
          changed &&
          customers.some(
            (customer) =>
              customer.id !== savedCustomer.id &&
              getCustomerKey(customer) === customerKey
          )
        ) {
          throw new Error(t("Another customer already uses this phone, Facebook or name"))
        }

        if (changed) await updateCustomer(savedCustomer.id, customerInput)
      } else {
        customerId =
          customers.find((customer) => getCustomerKey(customer) === customerKey)?.id ??
          (await insertCustomer(customerInput)).id
      }

      if (newShop) {
        shopId = (await insertShop({ ...newShop, ownerName: "", note: "" })).id
      }

      if (shopId && linkProduct) {
        productId = (
          await insertProduct(shopId, {
            name: productName.trim(),
            price: costPriceNumber,
            size: trimmedSize,
            variant: trimmedVariant,
            color: trimmedColor,
            imagePath: productImagePath,
          })
        ).id
        productRowSaved = true
      }

      const updatedOrder = await updateOrder({
        ...order,
        customerId,
        productId,
        cargoId,
        orderStatus,
        paymentStatus,
        quantity: quantityNumber,
        totalRetailerPrice,
        totalSellingPrice: sellingPriceNumber,
        customerMessageBurmese: customerMessage.trim(),
        productPhotoName: newPhotoDataUrl ? newPhotoName : order.productPhotoName,
        productPhotoPath,
        orderScreenshotPath: screenshotPath,
      })

      // The replaced photos are no longer used.
      await removePhotos(replacedPaths)

      setOrder(updatedOrder)
      router.push("/orders")
    } catch (saveError) {
      // A product photo that now belongs to a saved product must stay.
      await removePhotos(
        uploadedPaths.filter((path) => !(productRowSaved && path === productImagePath))
      )
      setError(messageOf(saveError, t("Could not save the order. Please try again")))
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
              <p className="mt-2 text-sm text-muted-foreground">{t("This order may have been deleted")}</p>
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

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="ml-auto rounded-xl text-destructive hover:text-destructive"
            aria-label={t("Delete order")}
            onClick={() => setConfirmingDelete(true)}
          >
            <IconTrash className="size-5" />
          </Button>
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
            <CardDescription>{t("View or replace the customer chat screenshot")}</CardDescription>
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
                    ? t("Photos are deleted on {date}", {
                        date: new Date(photoExpiresAt).toLocaleDateString(dateLocale(), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }),
                      })
                    : t(
                        isPro
                          ? "Photos are kept for 6 months after they are saved"
                          : "Photos are kept for 90 days after they are saved"
                      )}
                </p>
                {isPro ? null : (
                  <p className="text-xs text-muted-foreground">
                    <RichText text={t("Pro accounts keep photos for 6 months. To upgrade, contact {email}")} parts={{ email: <UpgradeLink account={account ?? undefined} /> }} />
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
            <CardDescription>{t("Where this product will be bought")}</CardDescription>
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
                emptyText={t("No saved shops match")}
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
                <p className="text-xs text-muted-foreground">{t("The shop is saved to your shop list with this order")}</p>
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
            <div className="grid grid-cols-3 gap-3">
              <TextInput
                id="productSize"
                label={t("Size")}
                value={productSize}
                onChange={setProductSize}
                placeholder="S, M, 42"
              />
              <TextInput
                id="productVariant"
                label={t("Variant")}
                value={productVariant}
                onChange={setProductVariant}
                placeholder={t("Cotton, slim")}
              />
              <TextInput
                id="productColor"
                label={t("Color")}
                value={productColor}
                onChange={setProductColor}
                placeholder={t("Black, White")}
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
                id="costPrice"
                label={t("Cost price")}
                disabled={priceLocked}
                value={costPrice}
                onChange={(value) => {
                setCostPrice(value)
                clearFieldError("costPrice")
              }}
              required
              error={fieldErrors.costPrice}
                type="number"
                placeholder="0"
              />
            </div>
            <TextInput
              id="sellingPrice"
              label={t("Total selling price")}
              value={sellingPrice}
              onChange={(value) => {
                setSellingPrice(value)
                clearFieldError("sellingPrice")
              }}
              required
              error={fieldErrors.sellingPrice}
              type="number"
              placeholder="0"
            />
            <div className="rounded-2xl bg-muted p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryItem
                  label={t("Customer total")}
                  value={formatAmount(toNumber(sellingPrice))}
                />
                <SummaryItem
                  label={t("Profit")}
                  value={formatAmount(
                    toNumber(sellingPrice) -
                      (priceLockedProduct
                        ? priceLockedProduct.price
                        : toNumber(costPrice)) *
                        toNumber(quantity)
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
            <CardDescription>{t("Optional. The cargo company that carries this order")}</CardDescription>
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
                emptyText={t("No saved cargo match")}
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
            <CardDescription>{t("Update payment and order progress")}</CardDescription>
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

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Delete {name}?", { name: order.orderNumber })}</DialogTitle>
            <DialogDescription>
              {t("This permanently removes the order and its photos")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingDelete(false)}
            >{t("Cancel")}</Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>{t("Delete order")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  error?: string
  disabled?: boolean
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
        disabled={disabled}
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
