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

import {
  OrderProductFields,
  ProductPhotoField,
  type ProductMode,
} from "@/components/order-product-fields"
import { OptionalSection } from "@/components/optional-section"
import { SearchPicker } from "@/components/search-picker"
import { FieldError, RequiredMark } from "@/components/field-error"
import { UpgradeLink } from "@/components/upgrade-link"
import { focusFirstError } from "@/lib/form-errors"
import {
  aiReadsLeft,
  fetchAiQuota,
  fetchProfile,
  type AiQuota,
} from "@/lib/profile"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
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

import { photoSizeFor, resizeImageToDataUrl } from "../../lib/image-resize"
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
  "costPrice",
  "sellingPrice",
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
  sellingPrice: number
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

      reject(new Error(translate("Invalid image file")))
    }

    reader.onerror = () => reject(new Error(translate("Could not read image file")))
    reader.readAsDataURL(file)
  })
}

// The server refused because the Free monthly limit is used up.
class AiLimitError extends Error {
  quota: AiQuota

  constructor(quota: AiQuota) {
    super(translate("You have used all your free AI reads this month"))
    this.quota = quota
  }
}

// A busy or unreachable Gemini. Worth one quiet retry.
class AiBusyError extends Error {}

async function readOrderWithGemini(
  file: File
): Promise<{ data: ExtractedOrder; quota?: AiQuota }> {
  // A chat screenshot needs more detail than a product thumbnail.
  const image = await resizeImageToDataUrl(file, 1600, 0.8)

  let response: Response

  try {
    response = await fetch("/api/extract-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    })
  } catch {
    throw new AiBusyError(translate("Could not reach the server. Check your connection"))
  }

  const result = (await response.json().catch(() => null)) as {
    data?: ExtractedOrder
    error?: string
    quota?: AiQuota
  } | null

  if (response.status === 429 && result?.quota) {
    throw new AiLimitError(result.quota)
  }

  if (!response.ok || !result?.data) {
    const message = translate(result?.error || "Gemini could not read this image")

    throw response.status === 502 || response.status === 504
      ? new AiBusyError(message)
      : new Error(message)
  }

  return { data: result.data, quota: result.quota }
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
  const [showMoreContacts, setShowMoreContacts] = useState(false)

  const [shops, setShops] = useState<LocalShop[]>([])
  const [shopMode, setShopMode] = useState<PickMode>("existing")
  const [selectedShopId, setSelectedShopId] = useState("")
  const [newShopName, setNewShopName] = useState("")
  const [newShopPhone, setNewShopPhone] = useState("")
  const [newShopLocation, setNewShopLocation] = useState("")

  const [productName, setProductName] = useState("")
  const [productSize, setProductSize] = useState("")
  const [productVariant, setProductVariant] = useState("")
  const [productColor, setProductColor] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [costPrice, setCostPrice] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  const [customerMessage, setCustomerMessage] = useState("")

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("not_paid")
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("not_bought")

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [saveScreenshot, setSaveScreenshot] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  // A read that failed, kept so the user can try again without choosing the
  // file again.
  const [failedAi, setFailedAi] = useState<{
    file: File
    dataUrl: string
    extractionId: number
    tries: number
  } | null>(null)
  const [showMoreProduct, setShowMoreProduct] = useState(false)
  const [showShopExtras, setShowShopExtras] = useState(false)
  const [screenshotPreview, setScreenshotPreview] = useState("")
  const [productMode, setProductMode] = useState<ProductMode>("existing")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState("")
  const [readStatus, setReadStatus] = useState("")
  const [aiQuota, setAiQuota] = useState<AiQuota | null>(null)
  // A screenshot waiting for the user to agree to the AI read.
  const [pendingAi, setPendingAi] = useState<{
    file: File
    dataUrl: string
    extractionId: number
  } | null>(null)
  const [isPro, setIsPro] = useState(false)

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
          setLoadError(messageOf(caughtLoadError, translate("Could not load your customers and shops")))
        }
      }
    }

    // The plan and AI reads used come from the signed-in account. The server
    // counts and limits the reads again before it calls Gemini.
    async function loadProfile() {
      const db = isSupabaseConfigured ? createClient() : null
      const [profile, quota] = await Promise.all([
        db ? fetchProfile(db) : null,
        db ? fetchAiQuota(db) : null,
      ])

      if (cancelled || !profile) return

      setAiQuota(quota)
      setIsPro(profile.plan === "pro")
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

  // AI is on when the account is known and has reads left.
  const photo = photoSizeFor(isPro)
  const useGemini = aiQuota !== null && aiReadsLeft(aiQuota) > 0
  const aiExhausted = aiQuota !== null && !useGemini

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
    setProductSize((value) => value || data.productSize)
    setProductColor((value) => value || data.productColor)
    if (data.customerMessage || data.productDescription) {
      setShowMoreProduct(true)
    }
    setCustomerMessage(
      (value) =>
        value ||
        [data.customerMessage, data.productDescription].filter(Boolean).join("\n")
    )
    if (data.facebookName || data.otherContacts) {
      if (
        (data.facebookName && data.facebookName !== data.customerName) ||
        data.otherContacts
      ) {
        setShowMoreContacts(true)
      }
    }
    if (data.quantity > 1) setQuantity(String(data.quantity))
    // The extracted price is for one item; the form takes the order total.
    setSellingPrice(
      (value) =>
        value ||
        (data.sellingPrice
          ? String(data.sellingPrice * Math.max(data.quantity, 1))
          : "")
    )

    const match = findMatchingCustomer(customers, {
      name: data.customerName,
      facebookName: data.facebookName || data.customerName,
      phone: data.phone,
    })

    if (match && !customerTouchedRef.current) {
      setSelectedCustomerKey(match.key)
      setCustomerMode("existing")
      return t("Matched saved customer {name}", { name: match.name })
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
    setPendingAi(null)
    setFailedAi(null)
    setSaveScreenshot(false)

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError(t("Please upload an image"))
      setScreenshotFile(null)
      event.target.value = ""
      return
    }

    let screenshotDataUrl = ""

    try {
      screenshotDataUrl = await readFileAsDataUrl(file)
    } catch {
      setError(t("Could not preview the image. Please choose another image"))
      setScreenshotFile(null)
      event.target.value = ""
      return
    }

    setScreenshotPreview(screenshotDataUrl)

    // With AI reads left, ask before anything leaves the device. Otherwise the
    // screenshot is read on this device.
    if (useGemini) {
      setPendingAi({ file, dataUrl: screenshotDataUrl, extractionId })
      return
    }

    await readOnDevice(file, screenshotDataUrl, extractionId, aiExhausted)
  }

  function showResult(
    data: ExtractedOrder,
    extractionId: number,
    withGemini: boolean
  ) {
    if (extractionIdRef.current !== extractionId) return

    const matchMessage = applyExtraction(data)

    setReadStatus(
      [
        withGemini ? t("Details filled by Gemini") : t("Details filled"),
        matchMessage,
        t("Please review before saving"),
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  function showReadError(caught: unknown, extractionId: number) {
    if (extractionIdRef.current !== extractionId) return

    setReadStatus(
      `${t(caught instanceof Error ? caught.message : "Could not read this screenshot")} ${t("You can fill the fields manually")}`
    )
  }

  async function readOnDevice(
    file: File,
    screenshotDataUrl: string,
    extractionId: number,
    limitReached = false
  ) {
    setReadStatus(t("Reading the screenshot on this device..."))

    try {
      const ocr = await readOrderWithOcr(file, screenshotDataUrl, (message) => {
        if (extractionIdRef.current === extractionId) setReadStatus(message)
      })

      const data: ExtractedOrder = {
        customerName: ocr.customerName,
        facebookName: ocr.customerName,
        phone: "",
        address: "",
        otherContacts: "",
        productName: "",
        productDescription: "",
        productSize: ocr.productSize,
        productColor: ocr.productColor,
        quantity: 1,
        sellingPrice: 0,
        customerMessage: ocr.customerMessage,
      }

      showResult(data, extractionId, false)

      if (limitReached && extractionIdRef.current === extractionId) {
        setReadStatus((status) =>
          `${status} ${t("You have used all your free AI reads this month")}`.trim()
        )
      }
    } catch (caught) {
      showReadError(caught, extractionId)
    }
  }

  // The user agreed: send the screenshot to Gemini. A busy Gemini is retried
  // once on its own; after that the user can try again by hand. The server
  // gives back a failed read, so trying again costs nothing.
  async function readWithAi(
    target:
      | { file: File; dataUrl: string; extractionId: number }
      | null = pendingAi,
    tries = 1
  ) {
    if (!target || aiBusy) return

    const { file, dataUrl, extractionId } = target

    setPendingAi(null)
    setFailedAi(null)
    setAiBusy(true)
    setReadStatus(t("Reading the screenshot with Gemini..."))

    try {
      let result: Awaited<ReturnType<typeof readOrderWithGemini>>

      try {
        result = await readOrderWithGemini(file)
      } catch (caught) {
        if (!(caught instanceof AiBusyError)) throw caught

        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (extractionIdRef.current !== extractionId) return

        result = await readOrderWithGemini(file)
      }

      if (result.quota) setAiQuota(result.quota)

      showResult(result.data, extractionId, true)
    } catch (caught) {
      if (caught instanceof AiLimitError) {
        // Used up elsewhere (another tab). Read on this device instead.
        setAiQuota(caught.quota)
        await readOnDevice(file, dataUrl, extractionId, true)
        return
      }

      if (extractionIdRef.current === extractionId) {
        setFailedAi({ file, dataUrl, extractionId, tries })
        showReadError(caught, extractionId)
      }
    } finally {
      setAiBusy(false)
    }
  }

  // After a failed read: stop trying and read on this device instead.
  async function readFailedOnDevice() {
    if (!failedAi) return

    const { file, dataUrl, extractionId } = failedAi

    setFailedAi(null)
    await readOnDevice(file, dataUrl, extractionId)
  }

  // The user declined: nothing is sent, the screenshot is read on this device.
  async function declineAi() {
    if (!pendingAi) return

    const { file, dataUrl, extractionId } = pendingAi

    setPendingAi(null)
    await readOnDevice(file, dataUrl, extractionId)
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
      setError(t("Please upload an image"))
      event.target.value = ""
      return
    }

    setError("")

    try {
      setProductPhotoPreview(await readFileAsDataUrl(file))
      setProductPhotoFile(file)
    } catch {
      setError(t("Could not preview the image. Please choose another image"))
      event.target.value = ""
    }
  }

  // A saved product's price is changed on the product, not on the order.
  const priceLocked =
    shopMode === "existing" &&
    productMode === "existing" &&
    !!shops
      .find((shop) => shop.id === selectedShopId)
      ?.products.some((product) => product.id === selectedProductId)

  async function pickProduct(product: LocalShopProduct) {
    setSelectedProductId(product.id)
    setProductName(product.name)
    setProductSize(product.size)
    setProductVariant(product.variant)
    setProductColor(product.color)
    setCostPrice(product.price ? String(product.price) : "")
    clearFieldError("productName", "costPrice")
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
    const trimmedVariant = productVariant.trim()
    const trimmedColor = productColor.trim()
    const trimmedProductName = productName.trim()
    const quantityNumber = Number(quantity.trim())
    const costPriceNumber = toNumber(costPrice)
    const sellingPriceNumber = toNumber(sellingPrice)

    // Check every required field at once, so all problems show together.
    const problems: Record<string, string> = {}

    if (customerMode === "existing") {
      if (!selectedCustomer) problems.customerPicker = t("Choose a customer")
    } else if (!customerName.trim()) {
      problems.customerName = t("Enter the customer's name")
    }

    if (shopMode === "existing") {
      if (!shops.some((shop) => shop.id === selectedShopId)) {
        problems.shopPicker = t("Choose a shop")
      }
    } else if (!newShopName.trim()) {
      problems.newShopName = t("Enter the shop's name")
    }

    if (!trimmedProductName) problems.productName = t("Enter the product name")

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

    // The order stores ids. A saved customer is used as is; a new one is
    // created below, unless a saved customer already matches it.
    let customerId = customerMode === "existing" ? (selectedCustomer?.key ?? "") : ""
    let newCustomer: CustomerInput | null = null

    if (customerMode !== "existing") {
      newCustomer = {
        name: customerName.trim(),
        facebookName: facebookName.trim(),
        phone: phone.trim(),
        address: location.trim(),
        otherContacts: otherContacts.trim(),
      }
    }

    // Shop: a saved one, or a new one that is created below.
    let shopId = ""
    let newShop: ShopInput | null = null

    if (shopMode === "existing") {
      shopId = selectedShopId
    } else {
      const shopName = newShopName.trim()

      const sameName = shops.find(
        (shop) => shop.name.trim().toLowerCase() === shopName.toLowerCase()
      )

      if (sameName) {
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
    const sameNameProduct = shopProducts.find(
      (product) =>
        product.name.trim().toLowerCase() === trimmedProductName.toLowerCase()
    )
    // A saved product keeps its own price; the order only multiplies it.
    const existingProduct =
      (productMode === "existing" ? pickedProduct : undefined) ??
      (shopMode === "existing" ? sameNameProduct : undefined)
    let productId = existingProduct?.id
    const unitPrice = existingProduct ? existingProduct.price : costPriceNumber
    const isNewProduct = !productId
    let productRowSaved = false

    try {
      // Photos go to Supabase Storage. Both are optional. A new product's
      // photo is also saved for the shop product, so deleting the order never
      // removes the shop's photo.
      if (screenshotFile && saveScreenshot) {
        orderScreenshotPath = await uploadPhoto(
          await resizeImageToDataUrl(screenshotFile, photo.maxSide, photo.quality),
          "orders"
        )
        uploadedPaths.push(orderScreenshotPath)
      }

      if (productPhotoFile) {
        const resized = await resizeImageToDataUrl(
          productPhotoFile,
          photo.maxSide,
          photo.quality
        )

        productPhotoPath = await uploadPhoto(resized, "orders")
        uploadedPaths.push(productPhotoPath)

        if (isNewProduct) {
          productImagePath = await uploadPhoto(resized, "products")
          uploadedPaths.push(productImagePath)
        }
      }

      const totalRetailerPrice = unitPrice * quantityNumber

      // Create what is new first, so the order can point to it by id. These
      // rows stay if saving the order fails afterwards; they are normal records.
      if (newCustomer) {
        const key = getCustomerKey(newCustomer)
        const saved = await listCustomers()

        customerId =
          saved.find((item) => getCustomerKey(item) === key)?.id ??
          (await insertCustomer(newCustomer)).id
      }

      if (newShop) shopId = (await insertShop(newShop)).id

      if (shopId && isNewProduct) {
        productId = (
          await insertProduct(shopId, {
            name: trimmedProductName,
            price: costPriceNumber,
            size: trimmedSize,
            variant: trimmedVariant,
            color: trimmedColor,
            imagePath: productImagePath,
          })
        ).id
        productRowSaved = true
      }

      // The order number and dates are set by the database.
      await insertOrder({
        customerId,
        productId,
        customerName: "",
        orderStatus,
        paymentStatus,
        quantity: quantityNumber,
        totalRetailerPrice,
        totalSellingPrice: sellingPriceNumber,
        customerMessageBurmese: customerMessage.trim(),
        productPhotoName: productPhotoFile?.name ?? "",
        productPhotoPath,
        orderScreenshotPath,
      })
    } catch (saveError) {
      // A product photo that now belongs to a saved product must stay.
      await removePhotos(
        uploadedPaths.filter((path) => !(productRowSaved && path === productImagePath))
      )
      setError(messageOf(saveError, t("Could not save the order")))
      setSaving(false)
      return
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
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              className="rounded-xl"
              onChange={handleScreenshotChange}
            />
            {aiQuota ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconSparkles className="size-3.5 shrink-0" />
                {aiQuota.max === null
                  ? t("AI reads used this month: {used}", { used: aiQuota.used })
                  : t("AI reads left this month: {left} of {max}", {
                      left: aiReadsLeft(aiQuota),
                      max: aiQuota.max,
                    })}
              </p>
            ) : null}
            {aiExhausted && !isPro ? (
              <p className="text-xs text-muted-foreground">
                <RichText text={t("Free accounts get {max} AI reads a month. Your reads come back next month. To upgrade to Pro for unlimited reads, contact {email}", { max: aiQuota?.max ?? 0 })} parts={{ email: <UpgradeLink /> }} />
              </p>
            ) : null}

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
                  <div className="space-y-3 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <IconSparkles className="mt-0.5 size-4 shrink-0" />
                      <span>{readStatus}</span>
                    </div>
                    {failedAi ? (
                      <div className="flex flex-wrap gap-2">
                        {failedAi.tries < 3 ? (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl"
                            disabled={aiBusy}
                            onClick={() =>
                              void readWithAi(failedAi, failedAi.tries + 1)
                            }
                          >
                            {t("Try again")}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={aiBusy}
                          onClick={() => void readFailedOnDevice()}
                        >
                          {t("Read on this device")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-xl"
                          onClick={() => {
                            setFailedAi(null)
                            setReadStatus("")
                          }}
                        >
                          {t("Fill by hand")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={saveScreenshot}
                    onCheckedChange={(checked) => setSaveScreenshot(checked === true)}
                  />
                  {t("Save this screenshot with the order")}
                </label>
                {saveScreenshot ? (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      isPro
                        ? "Photos are kept for 6 months after they are saved"
                        : "Photos are kept for 90 days after they are saved"
                    )}
                  </p>
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
            <CardDescription>{t("Choose a saved customer or add a new one")}</CardDescription>
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
                  emptyText={t("No saved customers match")}
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
                      <p className="text-muted-foreground">{t("No contact details saved")}</p>
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
                <OptionalSection
                  label={t("Facebook or other contacts")}
                  open={showMoreContacts}
                  onOpenChange={setShowMoreContacts}
                  hasValue={!!(facebookName.trim() || otherContacts.trim())}
                >
                  <TextField
                    id="facebookName"
                    label={t("Facebook name")}
                    value={facebookName}
                    onChange={setFacebookName}
                    placeholder={t("Facebook display name")}
                  />
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
                </OptionalSection>
                <p className="text-xs text-muted-foreground">{t("The customer is saved to your customer list with this order. Add more details later in Data")}</p>
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
            <CardDescription>{t("Where this product will be bought")}</CardDescription>
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
                emptyText={t("No saved shops match")}
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
                <OptionalSection
                  label={t("Phone, LINE or location")}
                  open={showShopExtras}
                  onOpenChange={setShowShopExtras}
                  hasValue={!!(newShopPhone.trim() || newShopLocation.trim())}
                >
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
                </OptionalSection>
                <p className="text-xs text-muted-foreground">{t("The shop is saved to your shop list with this order. You can add more details later in Data")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconMessage2 className="size-5 text-muted-foreground" />{t("Product Info")}</CardTitle>
            <CardDescription>{t("Product, price and customer note")}</CardDescription>
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

            <div className="grid grid-cols-3 gap-3">
              <TextField
                id="productSize"
                label={t("Size")}
                value={productSize}
                onChange={setProductSize}
                placeholder="S, M, 42"
              />
              <TextField
                id="productVariant"
                label={t("Variant")}
                value={productVariant}
                onChange={setProductVariant}
                placeholder={t("Cotton, slim")}
              />
              <TextField
                id="productColor"
                label={t("Color")}
                value={productColor}
                onChange={setProductColor}
                placeholder={t("Black, White")}
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
                id="costPrice"
                label={t("Cost price")}
                disabled={priceLocked}
                type="number"
                inputMode="decimal"
                min="0"
                value={costPrice}
                onChange={(value) => {
                setCostPrice(value)
                clearFieldError("costPrice")
              }}
              required
              error={fieldErrors.costPrice}
                placeholder="0"
              />
            </div>

            <TextField
              id="sellingPrice"
              label={t("Total selling price")}
              type="number"
              inputMode="decimal"
              min="0"
              value={sellingPrice}
              onChange={(value) => {
                setSellingPrice(value)
                clearFieldError("sellingPrice")
              }}
              required
              error={fieldErrors.sellingPrice}
              placeholder="0"
            />

            <OptionalSection
              label={t("Note or photo")}
              open={showMoreProduct}
              onOpenChange={setShowMoreProduct}
              hasValue={!!(customerMessage.trim() || productPhotoFile)}
            >
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
              <ProductPhotoField
                preview={productPhotoPreview}
                onChange={handleProductPhotoChange}
                label={t("Product photo (optional)")}
                hint={t(
                  isPro
                    ? "Photos are kept for 6 months after they are saved"
                    : "Photos are kept for 90 days after they are saved"
                )}
              />
            </OptionalSection>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconTruckDelivery className="size-5 text-muted-foreground" />{t("Status")}</CardTitle>
            <CardDescription>{t("Track payment and buying or delivery progress")}</CardDescription>
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

      <Dialog
        open={pendingAi !== null}
        onOpenChange={(open) => {
          if (!open) void declineAi()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSparkles className="size-5" />
              {t("Use AI to read your screenshot?")}
            </DialogTitle>
            <DialogDescription>
              {t("We will send this screenshot to Google Gemini. It reads the customer, product and message details and fills the form for you. Please check the details before saving")}
            </DialogDescription>
          </DialogHeader>
          {aiQuota ? (
            <p className="text-sm text-muted-foreground">
              {aiQuota.max === null
                ? t("AI reads used this month: {used}", { used: aiQuota.used })
                : t("This uses 1 of your {left} AI reads left this month", {
                    left: aiReadsLeft(aiQuota),
                  })}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void declineAi()}>
              {t("No thanks, read on this device")}
            </Button>
            <Button type="button" onClick={() => void readWithAi()}>
              {t("Agree and fill with AI")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  disabled,
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
        inputMode={inputMode}
        min={min}
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
