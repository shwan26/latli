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

import { SearchPicker } from "@/components/search-picker"
import { UpgradeLink } from "@/components/upgrade-link"
import { canUseGemini, fetchProfile } from "@/lib/profile"
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
import { type LocalShop } from "../../lib/local-shops"
import {
  insertCustomer,
  listCustomers,
  type CustomerInput,
} from "@/lib/db/customers"
import { insertOrder, listOrders } from "@/lib/db/orders"
import { removePhotos, uploadPhoto } from "@/lib/db/photos"
import { messageOf } from "@/lib/db/shared"
import { insertShop, listShops, type ShopInput } from "@/lib/db/shops"

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

      reject(new Error("Invalid image file."))
    }

    reader.onerror = () => reject(new Error("Could not read image file."))
    reader.readAsDataURL(file)
  })
}

type ImageBounds = {
  left: number
  top: number
  width: number
  height: number
}

function getImageElement(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load screenshot."))
    image.src = dataUrl
  })
}

function getImageDataUrl(
  image: HTMLImageElement,
  bounds: ImageBounds,
  type = "image/jpeg",
  quality = 0.9
) {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) return ""

  canvas.width = Math.max(1, Math.round(bounds.width))
  canvas.height = Math.max(1, Math.round(bounds.height))
  context.drawImage(
    image,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas.toDataURL(type, quality)
}

function findLikelyProductBounds(image: HTMLImageElement): ImageBounds {
  const width = image.naturalWidth
  const height = image.naturalHeight
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d", { willReadFrequently: true })

  if (!context) {
    return {
      left: Math.round(width * 0.08),
      top: Math.round(height * 0.16),
      width: Math.round(width * 0.84),
      height: Math.round(height * 0.45),
    }
  }

  const sampleWidth = 120
  const sampleHeight = Math.max(160, Math.round((height / width) * sampleWidth))
  canvas.width = sampleWidth
  canvas.height = sampleHeight
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight)

  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight).data
  const visited = new Uint8Array(sampleWidth * sampleHeight)
  const minY = Math.round(sampleHeight * 0.12)
  const maxY = Math.round(sampleHeight * 0.9)
  let best = { left: 0, top: 0, right: 0, bottom: 0, area: 0 }

  function isCandidatePixel(x: number, y: number) {
    const index = (y * sampleWidth + x) * 4
    const red = imageData[index]
    const green = imageData[index + 1]
    const blue = imageData[index + 2]
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)

    if (y < minY || y > maxY) return false
    if (max > 245 && min > 235) return false
    if (max < 18 && min < 18) return false
    if (blue > 170 && red < 90 && green < 160) return false

    return max - min > 10 || max < 225
  }

  for (let y = minY; y < maxY; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const start = y * sampleWidth + x

      if (visited[start] || !isCandidatePixel(x, y)) continue

      const queue = [start]
      visited[start] = 1
      let pointer = 0
      let left = x
      let right = x
      let top = y
      let bottom = y
      let area = 0

      while (pointer < queue.length) {
        const current = queue[pointer]
        pointer += 1
        area += 1

        const currentX = current % sampleWidth
        const currentY = Math.floor(current / sampleWidth)
        left = Math.min(left, currentX)
        right = Math.max(right, currentX)
        top = Math.min(top, currentY)
        bottom = Math.max(bottom, currentY)

        const neighbors = [
          current - 1,
          current + 1,
          current - sampleWidth,
          current + sampleWidth,
        ]

        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue

          const nextX = next % sampleWidth
          const nextY = Math.floor(next / sampleWidth)
          const crossesRow =
            Math.abs(nextX - currentX) > 1 || Math.abs(nextY - currentY) > 1

          if (crossesRow || !isCandidatePixel(nextX, nextY)) continue

          visited[next] = 1
          queue.push(next)
        }
      }

      const componentWidth = right - left + 1
      const componentHeight = bottom - top + 1
      const isLargeEnough = componentWidth > 22 && componentHeight > 22
      const isTooWideChrome =
        componentWidth > sampleWidth * 0.92 && componentHeight < 28

      if (isLargeEnough && !isTooWideChrome && area > best.area) {
        best = { left, top, right, bottom, area }
      }
    }
  }

  if (!best.area) {
    return {
      left: Math.round(width * 0.08),
      top: Math.round(height * 0.16),
      width: Math.round(width * 0.84),
      height: Math.round(height * 0.45),
    }
  }

  const scaleX = width / sampleWidth
  const scaleY = height / sampleHeight
  const paddingX = width * 0.015
  const paddingY = height * 0.012
  const left = Math.max(0, Math.floor(best.left * scaleX - paddingX))
  const top = Math.max(0, Math.floor(best.top * scaleY - paddingY))
  const right = Math.min(
    width,
    Math.ceil((best.right + 1) * scaleX + paddingX)
  )
  const bottom = Math.min(
    height,
    Math.ceil((best.bottom + 1) * scaleY + paddingY)
  )

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
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
    throw new Error(result?.error || "Gemini could not read this image.")
  }

  return result.data
}

export default function CreateOrderPage() {
  const router = useRouter()
  const extractionIdRef = useRef(0)
  const customerTouchedRef = useRef(false)

  const [error, setError] = useState("")
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

  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState("")
  const [orderScreenshotPreview, setOrderScreenshotPreview] = useState("")
  const [readStatus, setReadStatus] = useState("")
  const [useGemini, setUseGemini] = useState(false)

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
      } catch (loadError) {
        if (!cancelled) {
          setError(messageOf(loadError, "Could not load your customers and shops."))
        }
      }
    }

    // Plan and role come from the signed-in profile. The server checks them
    // again before it calls Gemini.
    async function loadProfile() {
      const profile = isSupabaseConfigured
        ? await fetchProfile(createClient())
        : null

      if (!cancelled && profile) setUseGemini(canUseGemini(profile))
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

  function chooseCustomerMode(mode: PickMode) {
    customerTouchedRef.current = true
    setCustomerMode(mode)
  }

  function chooseCustomer(key: string) {
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
      return `Matched saved customer ${match.name}.`
    }

    return ""
  }

  async function handleProductPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("")

    const file = event.target.files?.[0] ?? null
    const extractionId = extractionIdRef.current + 1
    extractionIdRef.current = extractionId
    setProductPhotoFile(file)
    setProductPhotoPreview("")
    setOrderScreenshotPreview("")
    setReadStatus("")

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please upload a product photo.")
      setProductPhotoFile(null)
      event.target.value = ""
      return
    }

    let screenshotDataUrl = ""

    try {
      screenshotDataUrl = await readFileAsDataUrl(file)
    } catch {
      setError("Could not preview the product photo. Please choose another image.")
      setProductPhotoFile(null)
      event.target.value = ""
      return
    }

    setOrderScreenshotPreview(screenshotDataUrl)
    setProductPhotoPreview(screenshotDataUrl)

    try {
      const image = await getImageElement(screenshotDataUrl)

      if (extractionIdRef.current !== extractionId) return

      setProductPhotoPreview(
        getImageDataUrl(image, findLikelyProductBounds(image)) ||
          screenshotDataUrl
      )
    } catch {
      // The full screenshot stays as the product photo.
    }

    // Managers on the Pro plan use Gemini. Everyone else reads on the device.
    const withGemini = useGemini

    setReadStatus(
      withGemini
        ? "Reading the screenshot with Gemini..."
        : "Reading the screenshot on this device..."
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
        `Details filled${withGemini ? " by Gemini" : ""}. ${matchMessage} Please review before saving.`.replace(
          "  ",
          " "
        )
      )
    } catch (caught) {
      if (extractionIdRef.current !== extractionId) return

      setReadStatus(
        `${caught instanceof Error ? caught.message : "Could not read this screenshot."} You can fill the fields manually.`
      )
    }
  }

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const trimmedSize = productSize.trim()
    const trimmedColor = productColor.trim()
    const trimmedDescription = productDescription.trim()
    const trimmedProductName = productName.trim()
    const quantityNumber = Math.max(toNumber(quantity), 0)
    const costPriceNumber = toNumber(costPriceThb)
    const sellingPriceNumber = toNumber(sellingPriceThb)

    if (!productPhotoFile) {
      setError("Product photo is required.")
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

    if (customerMode === "existing") {
      if (!selectedCustomer) {
        setError("Choose a customer, or switch to New customer.")
        return
      }

      customer = {
        name: selectedCustomer.name,
        facebookName: selectedCustomer.facebookName,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
      }
    } else {
      if (!customerName.trim()) {
        setError("Customer name is required.")
        return
      }

      customer = {
        name: customerName.trim(),
        facebookName: facebookName.trim(),
        phone: phone.trim(),
        address: location.trim(),
      }
      newCustomer = { ...customer, otherContacts: otherContacts.trim() }
    }

    // Shop: optional. A saved one, a new one, or none yet.
    let shopName = ""
    let newShop: ShopInput | null = null

    if (shopMode === "existing") {
      shopName = shops.find((shop) => shop.id === selectedShopId)?.name ?? ""
    } else if (newShopName.trim()) {
      shopName = newShopName.trim()

      const sameName = shops.find(
        (shop) => shop.name.trim().toLowerCase() === shopName.toLowerCase()
      )

      if (sameName) {
        shopName = sameName.name
      } else {
        newShop = {
          name: shopName,
          ownerName: "",
          phone: newShopPhone.trim(),
          location: newShopLocation.trim(),
          note: "",
        }
      }
    } else if (newShopPhone.trim() || newShopLocation.trim()) {
      setError("Enter the new shop's name, or clear its details.")
      return
    }

    if (!trimmedSize) {
      setError("Product size is required.")
      return
    }

    if (quantityNumber <= 0) {
      setError("Quantity must be at least 1.")
      return
    }

    setSaving(true)

    const uploadedPaths: string[] = []

    try {
      // Photos go to Supabase Storage. A cropped product photo is saved next
      // to the full screenshot. Without a crop, one resized copy is saved.
      const hasCrop =
        productPhotoPreview !== "" && productPhotoPreview !== orderScreenshotPreview

      const productPhotoPath = await uploadPhoto(
        hasCrop
          ? productPhotoPreview
          : await resizeImageToDataUrl(productPhotoFile, 1600, 0.8),
        "orders"
      )

      uploadedPaths.push(productPhotoPath)

      let orderScreenshotPath: string | undefined

      if (hasCrop) {
        orderScreenshotPath = await uploadPhoto(
          await resizeImageToDataUrl(productPhotoFile, 1600, 0.8),
          "orders"
        )
        uploadedPaths.push(orderScreenshotPath)
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

        baseCurrency: "THB",
        customerCurrency: "MMK",
        exchangeRateThbToMmk: 1,

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
        productPhotoName: productPhotoFile.name,
        productPhotoPath,
        orderScreenshotPath,
      })
    } catch (saveError) {
      await removePhotos(uploadedPaths)
      setError(messageOf(saveError, "Could not save the order."))
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

    if (newShop) {
      try {
        await insertShop(newShop)
      } catch {
        // Ignored on purpose, see above.
      }
    }

    router.push("/orders")
  }

  return (
    <main className="min-h-dvh bg-muted pb-28">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/orders" aria-label="Back to orders">
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>

          <div>
            <p className="text-sm text-muted-foreground">Orders</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              New Product Order
            </h1>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSaveOrder}
        className="mx-auto w-full max-w-md space-y-5 px-5 py-5"
      >
        {error ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconCamera className="size-5 text-muted-foreground" />
              Product Photo
            </CardTitle>
            <CardDescription>
              {useGemini
                ? "Upload the Messenger screenshot. Gemini reads the customer, product and message details and fills the form."
                : "Upload the Messenger screenshot. The product image and customer details are read on this device where possible."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              className="rounded-xl"
              onChange={handleProductPhotoChange}
            />
            <p className="text-xs text-muted-foreground">
              Photos are deleted 7 days after you save the order. Pro accounts
              can keep them for a month from the order page. To upgrade,
              contact <UpgradeLink />.
            </p>

            {productPhotoPreview ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border bg-background">
                  <Image
                    src={productPhotoPreview}
                    alt="Product photo preview"
                    width={800}
                    height={800}
                    unoptimized
                    className="max-h-96 w-full object-contain"
                  />
                </div>

                {orderScreenshotPreview &&
                orderScreenshotPreview !== productPhotoPreview ? (
                  <details className="rounded-xl border bg-background px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Original screenshot
                    </summary>
                    <Image
                      src={orderScreenshotPreview}
                      alt="Original order screenshot"
                      width={800}
                      height={1200}
                      unoptimized
                      className="mt-3 max-h-96 w-full object-contain"
                    />
                  </details>
                ) : null}

                {readStatus ? (
                  <div className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                    <IconSparkles className="mt-0.5 size-4 shrink-0" />
                    <span>{readStatus}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-background p-6 text-center">
                <IconCamera className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  No product photo selected
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconUser className="size-5 text-muted-foreground" />
              Customer
            </CardTitle>
            <CardDescription>
              Choose a saved customer or add a new one.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ModeToggle
              value={customerMode}
              onChange={chooseCustomerMode}
              existingLabel="Saved customer"
              newLabel="New customer"
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
                  placeholder="Choose a customer"
                  searchPlaceholder="Search name, phone, Facebook"
                  emptyText="No saved customers match."
                />

                {selectedCustomer ? (
                  <div className="space-y-1 rounded-2xl bg-muted p-3 text-sm">
                    {selectedCustomer.facebookName ? (
                      <p>Facebook: {selectedCustomer.facebookName}</p>
                    ) : null}
                    {selectedCustomer.phone ? (
                      <p>Phone: {selectedCustomer.phone}</p>
                    ) : null}
                    {selectedCustomer.address ? (
                      <p className="whitespace-pre-wrap">
                        Address: {selectedCustomer.address}
                      </p>
                    ) : null}
                    {!selectedCustomer.facebookName &&
                    !selectedCustomer.phone &&
                    !selectedCustomer.address ? (
                      <p className="text-muted-foreground">
                        No contact details saved.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <TextField
                  id="customerName"
                  label="Customer name"
                  value={customerName}
                  onChange={setCustomerName}
                  placeholder="Customer name"
                />
                <TextField
                  id="facebookName"
                  label="Facebook name"
                  value={facebookName}
                  onChange={setFacebookName}
                  placeholder="Facebook display name"
                />
                <TextField
                  id="phone"
                  label="Phone number"
                  value={phone}
                  onChange={setPhone}
                  placeholder="Phone number"
                  inputMode="tel"
                />
                <div className="space-y-2">
                  <Label htmlFor="location">Address</Label>
                  <Textarea
                    id="location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Customer delivery address"
                    className="min-h-24 rounded-xl text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherContacts">Other contacts</Label>
                  <Textarea
                    id="otherContacts"
                    value={otherContacts}
                    onChange={(event) => setOtherContacts(event.target.value)}
                    placeholder="Viber, Telegram, second phone"
                    className="min-h-20 rounded-xl text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The customer is saved to your customer list with this order.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconBuildingStore className="size-5 text-muted-foreground" />
              Shop
            </CardTitle>
            <CardDescription>
              Optional. Where this product will be bought.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ModeToggle
              value={shopMode}
              onChange={setShopMode}
              existingLabel="Saved shop"
              newLabel="New shop"
            />

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
                onChange={setSelectedShopId}
                placeholder="Choose a shop"
                searchPlaceholder="Search shop or location"
                emptyText="No saved shops match."
              />
            ) : (
              <div className="space-y-4">
                <TextField
                  id="newShopName"
                  label="Shop name"
                  value={newShopName}
                  onChange={setNewShopName}
                  placeholder="Bangkok shop"
                />
                <TextField
                  id="newShopPhone"
                  label="Phone or LINE (optional)"
                  value={newShopPhone}
                  onChange={setNewShopPhone}
                  placeholder="Phone number or LINE ID"
                />
                <div className="space-y-2">
                  <Label htmlFor="newShopLocation">Location (optional)</Label>
                  <Textarea
                    id="newShopLocation"
                    value={newShopLocation}
                    onChange={(event) => setNewShopLocation(event.target.value)}
                    placeholder="Shop address, mall, or market"
                    className="min-h-20 rounded-xl text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The shop is saved to your shop list with this order.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconMessage2 className="size-5 text-muted-foreground" />
              Product Info
            </CardTitle>
            <CardDescription>
              Record description, size, and color from the customer chat.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <TextField
              id="productName"
              label="Product name"
              value={productName}
              onChange={setProductName}
              placeholder="Nike Air Force 1, dress, bag..."
            />

            <div className="space-y-2">
              <Label htmlFor="productDescription">Description</Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Dress, bag, shoes, or product note"
                className="min-h-24 rounded-xl text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="productSize"
                label="Size / variant *"
                value={productSize}
                onChange={setProductSize}
                placeholder="XS, 42, L..."
              />
              <TextField
                id="productColor"
                label="Color"
                value={productColor}
                onChange={setProductColor}
                placeholder="White, black..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="quantity"
                label="Quantity"
                type="number"
                inputMode="numeric"
                min="1"
                value={quantity}
                onChange={setQuantity}
              />
              <TextField
                id="costPriceThb"
                label="Cost price (฿)"
                type="number"
                inputMode="decimal"
                min="0"
                value={costPriceThb}
                onChange={setCostPriceThb}
                placeholder="0"
              />
            </div>

            <TextField
              id="sellingPriceThb"
              label="Selling price (฿)"
              type="number"
              inputMode="decimal"
              min="0"
              value={sellingPriceThb}
              onChange={setSellingPriceThb}
              placeholder="0"
            />

            <div className="space-y-2">
              <Label htmlFor="customerMessage">Customer note</Label>
              <Textarea
                id="customerMessage"
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                placeholder="Optional: paste any Burmese message or note"
                className="min-h-24 rounded-xl text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconTruckDelivery className="size-5 text-muted-foreground" />
              Status
            </CardTitle>
            <CardDescription>
              Track payment and buying or delivery progress.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment status</Label>
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
                      {PAYMENT_STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentStatus === "partially_paid" ? (
              <TextField
                id="amountPaidThb"
                label="Amount paid so far (฿)"
                type="number"
                inputMode="decimal"
                min="0"
                value={amountPaidThb}
                onChange={setAmountPaidThb}
                placeholder="0"
              />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="orderStatus">Order status</Label>
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
                      {ORDER_STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-5 pb-5 pt-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md gap-3">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-xl">
              <Link href="/orders">Cancel</Link>
            </Button>

            <Button
              type="submit"
              className="h-12 flex-1 rounded-xl"
              disabled={saving}
            >
              <IconDeviceFloppy className="mr-2 size-5" />
              {saving ? "Saving..." : "Save Order"}
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
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  min?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl text-base"
      />
    </div>
  )
}
