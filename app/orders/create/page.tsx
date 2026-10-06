// app/orders/create/page.tsx

"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconBuildingStore,
  IconCamera,
  IconDeviceFloppy,
  IconMessage2,
  IconSparkles,
  IconTruckDelivery,
  IconUser,
} from "@tabler/icons-react"

import { OrderProductFields, type ProductMode } from "@/components/order-product-fields"
import { SearchPicker } from "@/components/search-picker"
import { FieldError, RequiredMark } from "@/components/field-error"
import { UpgradeLink } from "@/components/upgrade-link"
import { focusFirstError } from "@/lib/form-errors"
import { canUseGemini, canUseSecondCurrency, fetchProfile } from "@/lib/profile"
import { type Currency } from "../../lib/local-orders"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

import { resizeImageToDataUrl } from "../../lib/image-resize"
import { readOrderWithOcr } from "../../lib/screenshot-ocr"
import {
  buildCustomerSummaries,
  findMatchingCustomer,
  getCustomerKey,
  type CustomerSummary,
} from "../../lib/local-customers"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "../../lib/local-orders"
import { type LocalShop, type LocalShopProduct } from "../../lib/local-shops"
import {
  insertCustomer,
  listCustomers,
  type CustomerInput,
} from "@/lib/db/customers"
import { insertOrder, listOrders } from "@/lib/db/orders"
import { getPhotoUrls, removePhotos, uploadPhoto } from "@/lib/db/photos"
import { messageOf } from "@/lib/db/shared"
import { insertProduct, insertShop, listShops, type ShopInput } from "@/lib/db/shops"
import { useI18n } from "@/lib/i18n/provider"
import { RichText } from "@/components/rich-text"
import { translate } from "@/lib/i18n/runtime"

// Required fields from top to bottom, for moving to the first problem.
const FIELD_ORDER = [
  "customerPicker",
  "customerName",
  "shopPicker",
  "newShopName",
  "productName",
  "productSize",
  "quantity",
  "costPriceThb",
  "sellingPriceThb",
  "exchangeRate",
]

type PickMode = "existing" | "new"

type ExtractedOrder = {
  customerName: string
  facebookName: string
  phone: string
  address: string
  otherContacts: string
  productName: string
  productDescription: string
  productSize: string
  productColor: string
  quantity: number
  sellingPriceThb: number
  customerMessage: string
}

function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error(translate("Invalid image file.")))
    }

    reader.onerror = () => reject(new Error(translate("Could not read image file.")))
    reader.readAsDataURL(file)
  })
}

async function readOrderWithGemini(file: File): Promise<ExtractedOrder> {
  // A chat screenshot needs more detail than a product thumbnail.
  const image = await resizeImageToDataUrl(file, 1600, 0.8)

  const response = await fetch("/api/extract-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  })

  const result = (await response.json().catch(() => null)) as {
    data?: ExtractedOrder
    error?: string
  } | null

  if (!response.ok || !result?.data) {
    throw new Error(translate(result?.error || "Gemini could not read this image."))
  }

  return result.data
}

export default function CreateOrderPage() {
  const { t } = useI18n()

  const router = useRouter()
  const extractionIdRef = useRef(0)
  const customerTouchedRef = useRef(false)

  const [error, setError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [customerMode, setCustomerMode] = useState<PickMode>("existing")
  const [selectedCustomerKey, setSelectedCustomerKey] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [facebookName, setFacebookName] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [otherContacts, setOtherContacts] = useState("")

  const [shops, setShops] = useState<LocalShop[]>([])
  const [shopMode, setShopMode] = useState<PickMode>("existing")
  const [selectedShopId, setSelectedShopId] = useState("")
  const [newShopName, setNewShopName] = useState("")
  const [newShopPhone, setNewShopPhone] = useState("")
  const [newShopLocation, setNewShopLocation] = useState("")

  const [productName, setProductName] = useState("")
  const [productSize, setProductSize] = useState("")
  const [productColor, setProductColor] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [costPriceThb, setCostPriceThb] = useState("")
  const [sellingPriceThb, setSellingPriceThb] = useState("")
  const [customerMessage, setCustomerMessage] = useState("")

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("not_paid")
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("not_bought")
  const [amountPaidThb, setAmountPaidThb] = useState("")

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState("")
  const [productMode, setProductMode] = useState<ProductMode>("existing")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState("")
  const [readStatus, setReadStatus] = useState("")
  const [useGemini, setUseGemini] = useState(false)
  const [baseCurrency, setBaseCurrency] = useState<Currency>("MMK")
  // Pro accounts with a second currency charge the customer in it. Everyone
  // else charges in the primary currency at a rate of 1.
  const [secondCurrency, setSecondCurrency] = useState<Currency | null>(null)
  const [exchangeRate, setExchangeRate] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadRecords() {
      try {
        const [savedCustomers, orders, loadedShops] = await Promise.all([
          listCustomers(),
          listOrders(),
          listShops(),
        ])

        if (cancelled) return

        const loadedCustomers = buildCustomerSummaries(savedCustomers, orders)

        setCustomers(loadedCustomers)
        setShops(loadedShops)

        // With nothing saved yet, go straight to the new-record form.
        if (loadedCustomers.length === 0) setCustomerMode("new")
        if (loadedShops.length === 0) setShopMode("new")
      } catch (caughtLoadError) {
        if (!cancelled) {
          setLoadError(messageOf(caughtLoadError, translate("Could not load your customers and shops.")))
        }
      }
    }

    // Plan and role come from the signed-in profile. The server checks them
    // again before it calls Gemini.
    async function loadProfile() {
      const profile = isSupabaseConfigured
        ? await fetchProfile(createClient())
        : null

      if (cancelled || !profile) return

      setUseGemini(canUseGemini(profile))
      setBaseCurrency(profile.baseCurrency)

      if (canUseSecondCurrency(profile) && profile.secondaryCurrency) {
        setSecondCurrency(profile.secondaryCurrency)
        setExchangeRate(
          profile.defaultExchangeRate ? String(profile.defaultExchangeRate) : ""
        )
      }
    }

    void loadRecords()
    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedCustomer = customers.find(
    (customer) => customer.key === selectedCustomerKey
  )

  function clearFieldError(...ids: string[]) {
    setFieldErrors((current) => {
      if (!ids.some((id) => current[id])) return current

      const next = { ...current }

      for (const id of ids) delete next[id]

      return next
    })
  }

  function chooseCustomerMode(mode: PickMode) {
    clearFieldError("customerPicker", "customerName")
    customerTouchedRef.current = true
    setCustomerMode(mode)
  }

  function chooseCustomer(key: string) {
    clearFieldError("customerPicker")
    customerTouchedRef.current = true
    setSelectedCustomerKey(key)
  }

  function applyExtraction(data: ExtractedOrder) {
    setCustomerName((value) => value || data.customerName)
    setFacebookName((value) => value || data.facebookName || data.customerName)
    setPhone((value) => value || data.phone)
    setLocation((value) => value || data.address)
    setOtherContacts((value) => value || data.otherContacts)
    setProductName((value) => value || data.productName)
    setProductDescription((value) => value || data.productDescription)
    setProductSize((value) => value || data.productSize)
    setProductColor((value) => value || data.productColor)
    setCustomerMessage((value) => value || data.customerMessage)
    if (data.quantity > 1) setQuantity(String(data.quantity))
    setSellingPriceThb(
      (value) =>
        value || (data.sellingPriceThb ? String(data.sellingPriceThb) : "")
    )

    const match = findMatchingCustomer(customers, {
      name: data.customerName,
      facebookName: data.facebookName || data.customerName,
      phone: data.phone,
    })

    if (match && !customerTouchedRef.current) {
      setSelectedCustomerKey(match.key)
      setCustomerMode("existing")
      return t("Matched saved customer {name}.", { name: match.name })
    }

    return ""
  }

  async function handleScreenshotChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("")

    const file = event.target.files?.[0] ?? null
    const extractionId = extractionIdRef.current + 1
    extractionIdRef.current = extractionId
    setScreenshotFile(file)
    setScreenshotPreview("")
    setReadStatus("")

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError(t("Please upload an image."))
      setScreenshotFile(null)
      event.target.value = ""
      return
    }

    let screenshotDataUrl = ""

    try {
      screenshotDataUrl = await readFileAsDataUrl(file)
    } catch {
      setError(t("Could not preview the image. Please choose another image."))
      setScreenshotFile(null)
      event.target.value = ""
      return
    }

    setScreenshotPreview(screenshotDataUrl)

    // Managers on the Pro plan use Gemini. Everyone else reads on the device.
    const withGemini = useGemini

    setReadStatus(
      withGemini
        ? t("Reading the screenshot with Gemini...")
        : t("Reading the screenshot on this device...")
    )

    try {
      let data: ExtractedOrder

      if (withGemini) {
        data = await readOrderWithGemini(file)
      } else {
        const ocr = await readOrderWithOcr(file, screenshotDataUrl, (message) => {
          if (extractionIdRef.current === extractionId) setReadStatus(message)
        })

        data = {
          customerName: ocr.customerName,
          facebookName: ocr.customerName,
          phone: "",
          address: "",
          otherContacts: "",
          productName: "",
          productDescription: [
            ocr.productColor && `Color: ${ocr.productColor}`,
            ocr.productSize && `Size: ${ocr.productSize}`,
          ]
            .filter(Boolean)
            .join("\n"),
          productSize: ocr.productSize,
          productColor: ocr.productColor,
          quantity: 1,
          sellingPriceThb: 0,
          customerMessage: ocr.customerMessage,
        }
      }

      if (extractionIdRef.current !== extractionId) return

      const matchMessage = applyExtraction(data)

      setReadStatus(
        [
          withGemini ? t("Details filled by Gemini.") : t("Details filled."),
          matchMessage,
          t("Please review before saving."),
        ]
          .filter(Boolean)
          .join(" ")
      )
    } catch (caught) {
      if (extractionIdRef.current !== extractionId) return

      setReadStatus(
        `${t(caught instanceof Error ? caught.message : "Could not read this screenshot.")} ${t("You can fill the fields manually.")}`
      )
    }
  }

  async function handleProductPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setProductPhotoFile(null)
      setProductPhotoPreview("")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError(t("Please upload an image."))
      event.target.value = ""
      return
    }

    setError("")

    try {
      setProductPhotoPreview(await readFileAsDataUrl(file))
      setProductPhotoFile(file)
    } catch {
      setError(t("Could not preview the image. Please choose another image."))
      event.target.value = ""
    }
  }

  async function pickProduct(product: LocalShopProduct) {
    setSelectedProductId(product.id)
    setProductName(product.name)
    setProductSize(product.note)
    setCostPriceThb(product.priceThb ? String(product.priceThb) : "")
    clearFieldError("productName", "productSize", "costPriceThb")
    setProductPhotoFile(null)
    setProductPhotoPreview("")

    if (product.imagePath) {
      try {
        const urls = await getPhotoUrls([product.imagePath])

        setProductPhotoPreview((current) => current || (urls[product.imagePath!] ?? ""))
      } catch {
        // The photo is only a preview.
      }
    }
  }

  function chooseShop(id: string) {
    setSelectedShopId(id)
    clearFieldError("shopPicker")
    setSelectedProductId("")
    setProductMode("existing")
  }

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const trimmedSize = productSize.trim()
    const trimmedColor = productColor.trim()
    const trimmedDescription = productDescription.trim()
    const trimmedProductName = productName.trim()
    const quantityNumber = Number(quantity.trim())
    const costPriceNumber = toNumber(costPriceThb)
    const sellingPriceNumber = toNumber(sellingPriceThb)

    // Check every required field at once, so all problems show together.
    const problems: Record<string, string> = {}

    if (customerMode === "existing") {
      if (!selectedCustomer) problems.customerPicker = t("Choose a customer.")
    } else if (!customerName.trim()) {
      problems.customerName = t("Enter the customer's name.")
    }

    if (shopMode === "existing") {
      if (!shops.some((shop) => shop.id === selectedShopId)) {
        problems.shopPicker = t("Choose a shop.")
      }
    } else if (!newShopName.trim()) {
      problems.newShopName = t("Enter the shop's name.")
    }

    if (!trimmedProductName) problems.productName = t("Enter the product name.")
    if (!trimmedSize) problems.productSize = t("Enter the size or variant.")

    if (!quantity.trim() || !Number.isInteger(quantityNumber) || quantityNumber < 1) {
      problems.quantity = t("Quantity must be at least 1.")
    }

    if (costPriceThb.trim() === "" || !(Number(costPriceThb) >= 0)) {
      problems.costPriceThb = t("Enter the cost price.")
    }

    if (secondCurrency && !(Number(exchangeRate) > 0)) {
      problems.exchangeRate = t("Enter an exchange rate greater than 0.")
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

    // Customer: a saved one, or a new one that is saved with the order.
    let customer: {
      name: string
      facebookName: string
      phone: string
      address: string
    }
    let newCustomer: CustomerInput | null = null

    if (customerMode === "existing" && selectedCustomer) {
      customer = {
        name: selectedCustomer.name,
        facebookName: selectedCustomer.facebookName,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
      }
    } else {
      customer = {
        name: customerName.trim(),
        facebookName: facebookName.trim(),
        phone: phone.trim(),
        address: location.trim(),
      }
      newCustomer = { ...customer, otherContacts: otherContacts.trim() }
    }

    // Shop: a saved one, or a new one that is saved with the order.
    let shopName = ""
    let shopId = ""
    let newShop: ShopInput | null = null

    if (shopMode === "existing") {
      shopName = shops.find((shop) => shop.id === selectedShopId)?.name ?? ""
      shopId = selectedShopId
    } else {
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
          ownerName: "",
          phone: newShopPhone.trim(),
          location: newShopLocation.trim(),
          note: "",
        }
      }
    }

    setSaving(true)

    const uploadedPaths: string[] = []
    let orderScreenshotPath: string | undefined
    let productPhotoPath: string | undefined
    let productImagePath: string | undefined

    // A product picked from the shop is already saved. Anything else is new.
    const pickedProduct =
      shopMode === "existing"
        ? shops
            .find((shop) => shop.id === selectedShopId)
            ?.products.find((product) => product.id === selectedProductId)
        : undefined
    const shopProducts = shops.find((shop) => shop.id === selectedShopId)?.products ?? []
    const isNewProduct =
      !(productMode === "existing" && pickedProduct) &&
      !(
        shopMode === "existing" &&
        shopProducts.some(
          (product) =>
            product.name.trim().toLowerCase() === trimmedProductName.toLowerCase()
        )
      )

    try {
      // Photos go to Supabase Storage. Both are optional. A new product's
      // photo is also saved for the shop product, so deleting the order never
      // removes the shop's photo.
      if (screenshotFile) {
        orderScreenshotPath = await uploadPhoto(
          await resizeImageToDataUrl(screenshotFile, 1600, 0.8),
          "orders"
        )
        uploadedPaths.push(orderScreenshotPath)
      }

      if (productPhotoFile) {
        const resized = await resizeImageToDataUrl(productPhotoFile, 1600, 0.8)

        productPhotoPath = await uploadPhoto(resized, "orders")
        uploadedPaths.push(productPhotoPath)

        if (isNewProduct) {
          productImagePath = await uploadPhoto(resized, "products")
          uploadedPaths.push(productImagePath)
        }
      }

      const totalRetailerCostThb = costPriceNumber * quantityNumber
      const totalCustomerPayableThb = sellingPriceNumber * quantityNumber

      const totalPaidThb =
        paymentStatus === "fully_paid" || paymentStatus === "refunded"
          ? totalCustomerPayableThb
          : paymentStatus === "partially_paid"
            ? Math.min(toNumber(amountPaidThb), totalCustomerPayableThb)
            : 0
      const remainingBalanceThb =
        paymentStatus === "refunded"
          ? 0
          : Math.max(totalCustomerPayableThb - totalPaidThb, 0)

      // The order number and dates are set by the database.
      await insertOrder({
        customerName: customer.name,

        orderStatus,
        paymentStatus,

        baseCurrency,
        customerCurrency: secondCurrency ?? baseCurrency,
        exchangeRateThbToMmk: secondCurrency ? toNumber(exchangeRate) : 1,

        totalRetailerCostThb,
        totalCustomerPayableThb,
        totalPaidThb,
        remainingBalanceThb,
        profitThb: totalCustomerPayableThb - totalRetailerCostThb,

        facebookName: customer.facebookName,
        phone: customer.phone,
        address: customer.address,

        sourceType: "customer_chat",
        customerMessageBurmese: customerMessage.trim(),
        productName:
          trimmedProductName || trimmedDescription || "Product photo order",
        productOption: trimmedSize,
        quantity: quantityNumber,
        productSize: trimmedSize,
        productColor: trimmedColor,
        productDescription: trimmedDescription,
        productNote: trimmedDescription,
        retailerName: shopName,
        retailerUnitPriceThb: costPriceNumber,
        sellingUnitPriceThb: sellingPriceNumber,
        productPhotoName: productPhotoFile?.name ?? "",
        productPhotoPath,
        orderScreenshotPath,
      })
    } catch (saveError) {
      await removePhotos(uploadedPaths)
      setError(messageOf(saveError, t("Could not save the order.")))
      setSaving(false)
      return
    }

    // The order already holds the customer and shop details, so a failure to
    // save the new records does not undo the order.
    if (newCustomer) {
      try {
        const key = getCustomerKey(newCustomer)
        const saved = await listCustomers()

        if (!saved.some((item) => getCustomerKey(item) === key)) {
          await insertCustomer(newCustomer)
        }
      } catch {
        // Ignored on purpose, see above.
      }
    }

    // A new product is saved to its shop, which may be the new shop above.
    try {
      if (newShop) shopId = (await insertShop(newShop)).id

      if (shopId && isNewProduct) {
        await insertProduct(shopId, {
          name: trimmedProductName,
          priceThb: costPriceNumber,
          note: trimmedSize,
          imagePath: productImagePath,
        })
      }
    } catch {
      await removePhotos([productImagePath])
    }

    router.push("/orders")
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

          <div>
            <p className="text-sm text-muted-foreground">{t("Orders")}</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("New Product Order")}</h1>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSaveOrder}
        className="mx-auto w-full max-w-md space-y-5 px-5 pb-40 pt-5"
      >
        {loadError ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <p className="text-xs text-muted-foreground">
          <RequiredMark /> {t("required")}
        </p>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconCamera className="size-5 text-muted-foreground" />{t("Chat Screenshot")}
            </CardTitle>
            <CardDescription>
              {useGemini
                ? t("Optional. Upload the Messenger screenshot. Gemini reads the customer, product and message details and fills the form.")
                : t("Optional. Upload the Messenger screenshot. The customer and product details are read on this device where possible.")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              className="rounded-xl"
              onChange={handleScreenshotChange}
            />
            <p className="text-xs text-muted-foreground">
              <RichText text={t("Photos are deleted 7 days after you save the order. Pro accounts can keep them for a month from the order page. To upgrade, contact {email}.")} parts={{ email: <UpgradeLink /> }} />
            </p>

            {screenshotPreview ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border bg-background">
                  <Image
                    src={screenshotPreview}
                    alt={t("Original order screenshot")}
                    width={800}
                    height={1200}
                    unoptimized
                    className="max-h-96 w-full object-contain"
                  />
                </div>

                {readStatus ? (
                  <div className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                    <IconSparkles className="mt-0.5 size-4 shrink-0" />
                    <span>{readStatus}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconUser className="size-5 text-muted-foreground" />{t("Customer")}
              <RequiredMark />
            </CardTitle>
            <CardDescription>{t("Choose a saved customer or add a new one.")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ModeToggle
              value={customerMode}
              onChange={chooseCustomerMode}
              existingLabel={t("Saved customer")}
              newLabel={t("New customer")}
            />

            {customerMode === "existing" ? (
              <div className="space-y-3">
                <SearchPicker
                  id="customerPicker"
                  items={customers.map((customer) => ({
                    value: customer.key,
                    label: customer.name,
                    description:
                      customer.phone || customer.facebookName || undefined,
                  }))}
                  value={selectedCustomerKey}
                  onChange={chooseCustomer}
                  placeholder={t("Choose a customer")}
                  searchPlaceholder={t("Search name, phone, Facebook")}
                  emptyText={t("No saved customers match.")}
                />
                <FieldError id="customerPicker" message={fieldErrors.customerPicker} />

                {selectedCustomer ? (
                  <div className="space-y-1 rounded-2xl bg-muted p-3 text-sm">
                    {selectedCustomer.facebookName ? (
                      <p>{t("Facebook: {value}", { value: selectedCustomer.facebookName })}</p>
                    ) : null}
                    {selectedCustomer.phone ? (
                      <p>{t("Phone: {value}", { value: selectedCustomer.phone })}</p>
                    ) : null}
                    {selectedCustomer.address ? (
                      <p className="whitespace-pre-wrap">
                        {t("Address: {value}", { value: selectedCustomer.address })}
                      </p>
                    ) : null}
                    {!selectedCustomer.facebookName &&
                    !selectedCustomer.phone &&
                    !selectedCustomer.address ? (
                      <p className="text-muted-foreground">{t("No contact details saved.")}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <TextField
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
                <TextField
                  id="facebookName"
                  label={t("Facebook name")}
                  value={facebookName}
                  onChange={setFacebookName}
                  placeholder={t("Facebook display name")}
                />
                <TextField
                  id="phone"
                  label={t("Phone number")}
                  value={phone}
                  onChange={setPhone}
                  placeholder={t("Phone number")}
                  inputMode="tel"
                />
                <div className="space-y-2">
                  <Label htmlFor="location">{t("Address")}</Label>
                  <Textarea
                    id="location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder={t("Customer delivery address")}
                    className="min-h-24 rounded-xl text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherContacts">{t("Other contacts")}</Label>
                  <Textarea
                    id="otherContacts"
                    value={otherContacts}
                    onChange={(event) => setOtherContacts(event.target.value)}
                    placeholder={t("Viber, Telegram, second phone")}
                    className="min-h-20 rounded-xl text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("The customer is saved to your customer list with this order.")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconBuildingStore className="size-5 text-muted-foreground" />{t("Shop")}
              <RequiredMark />
            </CardTitle>
            <CardDescription>{t("Where this product will be bought.")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ModeToggle
              value={shopMode}
              onChange={(mode) => {
                setShopMode(mode)
                clearFieldError("shopPicker", "newShopName")
              }}
              existingLabel={t("Saved shop")}
              newLabel={t("New shop")}
            />

            {shopMode === "existing" ? (
              <div className="space-y-2">
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
              <FieldError id="shopPicker" message={fieldErrors.shopPicker} />
              </div>
            ) : (
              <div className="space-y-4">
                <TextField
                  id="newShopName"
                  label={t("Shop name")}
                  value={newShopName}
                  onChange={(value) => {
                setNewShopName(value)
                clearFieldError("newShopName")
              }}
              required
              error={fieldErrors.newShopName}
                  placeholder={t("Bangkok shop")}
                />
                <TextField
                  id="newShopPhone"
                  label={t("Phone or LINE (optional)")}
                  value={newShopPhone}
                  onChange={setNewShopPhone}
                  placeholder={t("Phone number or LINE ID")}
                />
                <div className="space-y-2">
                  <Label htmlFor="newShopLocation">{t("Location (optional)")}</Label>
                  <Textarea
                    id="newShopLocation"
                    value={newShopLocation}
                    onChange={(event) => setNewShopLocation(event.target.value)}
                    placeholder={t("Shop address, mall, or market")}
                    className="min-h-20 rounded-xl text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("The shop is saved to your shop list with this order.")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconMessage2 className="size-5 text-muted-foreground" />{t("Product Info")}</CardTitle>
            <CardDescription>{t("Record description, size, and color from the customer chat.")}</CardDescription>
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
              photoPreview={productPhotoPreview}
              onPhotoChange={handleProductPhotoChange}
              photoLabel={t("Product photo (optional)")}
            />

            <TextField
              id="productName"
              label={t("Product name")}
              value={productName}
              onChange={(value) => {
                setProductName(value)
                clearFieldError("productName")
              }}
              required
              error={fieldErrors.productName}
              placeholder={t("Nike Air Force 1, dress, bag...")}
            />

            <div className="space-y-2">
              <Label htmlFor="productDescription">{t("Description")}</Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder={t("Dress, bag, shoes, or product note")}
                className="min-h-24 rounded-xl text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextField
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
              <TextField
                id="productColor"
                label={t("Color")}
                value={productColor}
                onChange={setProductColor}
                placeholder={t("White, black...")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="quantity"
                label={t("Quantity")}
                type="number"
                inputMode="numeric"
                min="1"
                value={quantity}
                onChange={(value) => {
                setQuantity(value)
                clearFieldError("quantity")
              }}
              required
              error={fieldErrors.quantity}
              />
              <TextField
                id="costPriceThb"
                label={t("Cost price (฿)").replace("฿", baseCurrency)}
                type="number"
                inputMode="decimal"
                min="0"
                value={costPriceThb}
                onChange={(value) => {
                setCostPriceThb(value)
                clearFieldError("costPriceThb")
              }}
              required
              error={fieldErrors.costPriceThb}
                placeholder="0"
              />
            </div>

            <TextField
              id="sellingPriceThb"
              label={t("Selling price (฿)").replace("฿", baseCurrency)}
              type="number"
              inputMode="decimal"
              min="0"
              value={sellingPriceThb}
              onChange={(value) => {
                setSellingPriceThb(value)
                clearFieldError("sellingPriceThb")
              }}
              required
              error={fieldErrors.sellingPriceThb}
              placeholder="0"
            />

            {secondCurrency ? (
              <TextField
                id="exchangeRate"
                label={`${t("Exchange rate")} (1 ${baseCurrency} = ? ${secondCurrency})`}
                type="number"
                inputMode="decimal"
                min="0"
                value={exchangeRate}
                onChange={(value) => {
                  setExchangeRate(value)
                  clearFieldError("exchangeRate")
                }}
                required
                error={fieldErrors.exchangeRate}
                placeholder="0"
              />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="customerMessage">{t("Customer note")}</Label>
              <Textarea
                id="customerMessage"
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                placeholder={t("Optional: paste any Burmese message or note")}
                className="min-h-24 rounded-xl text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconTruckDelivery className="size-5 text-muted-foreground" />{t("Status")}</CardTitle>
            <CardDescription>{t("Track payment and buying or delivery progress.")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">{t("Payment status")}</Label>
              <Select
                value={paymentStatus}
                onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}
              >
                <SelectTrigger id="paymentStatus" className="h-12 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(PAYMENT_STATUS_LABELS[key])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentStatus === "partially_paid" ? (
              <TextField
                id="amountPaidThb"
                label={t("Amount paid so far (฿)").replace("฿", baseCurrency)}
                type="number"
                inputMode="decimal"
                min="0"
                value={amountPaidThb}
                onChange={setAmountPaidThb}
                placeholder="0"
              />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="orderStatus">{t("Order status")}</Label>
              <Select
                value={orderStatus}
                onValueChange={(value) => setOrderStatus(value as OrderStatus)}
              >
                <SelectTrigger id="orderStatus" className="h-12 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(ORDER_STATUS_LABELS[key])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {saving ? t("Saving...") : t("Save Order")}
            </Button>
          </div>
        </div>
      </form>
    </main>
  )
}

function ModeToggle({
  value,
  onChange,
  existingLabel,
  newLabel,
}: {
  value: PickMode
  onChange: (value: PickMode) => void
  existingLabel: string
  newLabel: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={value === "existing" ? "default" : "outline"}
        className="h-11 rounded-xl"
        aria-pressed={value === "existing"}
        onClick={() => onChange("existing")}
      >
        {existingLabel}
      </Button>
      <Button
        type="button"
        variant={value === "new" ? "default" : "outline"}
        className="h-11 rounded-xl"
        aria-pressed={value === "new"}
        onClick={() => onChange("new")}
      >
        {newLabel}
      </Button>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  min,
  required,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  min?: string
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
        inputMode={inputMode}
        min={min}
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
