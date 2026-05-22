// app/orders/create/page.tsx

"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconCamera,
  IconDeviceFloppy,
  IconMessage2,
  IconSparkles,
  IconTruckDelivery,
  IconUser,
} from "@tabler/icons-react"

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

type Currency = "THB" | "MMK"

type LocalOrder = {
  id: string
  orderNumber: string
  customerName: string

  orderStatus:
    | "new_order"
    | "waiting_deposit"
    | "deposit_paid"
    | "ordered_from_retailer"
    | "received_from_retailer"
    | "sent_to_cargo"
    | "in_delivery"
    | "delivered"
    | "completed"
    | "cancelled"

  paymentStatus:
    | "not_paid"
    | "receiving"
    | "deposit_paid"
    | "partially_paid"
    | "fully_paid"
    | "refunded"

  deliveryStatus:
    | "not_arranged"
    | "product_bought"
    | "waiting_pickup"
    | "picked_up"
    | "sent_to_cargo"
    | "in_transit"
    | "delivered"
    | "delayed"
    | "returned"

  baseCurrency: "THB"
  customerCurrency: Currency
  exchangeRateThbToMmk: number

  totalRetailerCostThb: number
  totalCustomerPayableThb: number
  totalPaidThb: number
  remainingBalanceThb: number
  profitThb: number

  createdAt: string

  facebookName?: string
  phone?: string
  address?: string

  sourceType?: string
  customerMessageBurmese?: string
  productSize?: string
  productColor?: string
  productDescription?: string
  productPhotoName?: string
  productPhotoDataUrl?: string
  orderScreenshotName?: string
  orderScreenshotDataUrl?: string

  productName?: string
  productOption?: string
  quantity?: number
  productNote?: string

  retailerUnitPriceThb?: number
  sellingUnitPriceThb?: number
}

const LOCAL_STORAGE_KEY = "latli_orders"

function getStoredOrders(): LocalOrder[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)

  if (!stored) {
    return []
  }

  try {
    return JSON.parse(stored) as LocalOrder[]
  } catch {
    return []
  }
}

function createOrderNumber(orderCount: number) {
  return `ORD-${String(orderCount + 1).padStart(4, "0")}`
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

type ScreenshotExtraction = {
  customerName: string
  productSize: string
  productColor: string
  customerMessage: string
  productPhotoDataUrl: string
  ocrText: string
}

const colorWords = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "pink",
  "purple",
  "brown",
  "gray",
  "grey",
  "beige",
  "cream",
  "navy",
  "orange",
]

const ignoredNameLines = [
  "intake",
  "active now",
  "reply",
  "suggested",
  "create order",
  "mark as lead",
  "hello",
  "min thuka",
]

const myanmarDigits: Record<string, string> = {
  "၀": "0",
  "၁": "1",
  "၂": "2",
  "၃": "3",
  "၄": "4",
  "၅": "5",
  "၆": "6",
  "၇": "7",
  "၈": "8",
  "၉": "9",
}

function normalizeDigits(value: string) {
  return value.replace(/[၀-၉]/g, (digit) => myanmarDigits[digit] ?? digit)
}

function normalizeOcrLine(value: string) {
  return normalizeDigits(value)
    .replace(/[|_*~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseCustomerName(text: string) {
  const lines = text
    .split(/\n+/)
    .map(normalizeOcrLine)
    .filter(Boolean)

  const nameLine = lines.find((line) => {
    const lower = line.toLowerCase()
    const hasLetters = /[a-z]/i.test(line)
    const hasMostlyNameChars = /^[a-z .'-]+$/i.test(line)
    const isIgnored = ignoredNameLines.some((word) => lower.includes(word))
    const isStatusLine = /\b\d{1,2}[:.]\d{2}\b|[0-9]{2,}|pm|am|lte|5g|4g/i.test(
      line
    )

    return hasLetters && hasMostlyNameChars && !isIgnored && !isStatusLine
  })

  return nameLine?.replace(/\s+\.+$/, "...") ?? ""
}

function parseSizeAndColor(text: string) {
  const normalized = normalizeDigits(text).replace(/\s+/g, " ")
  const colorSizeMatch = normalized.match(
    /\b(black|white|red|blue|green|yellow|pink|purple|brown|gr[ae]y|beige|cream|navy|orange)\s*[-:/]?\s*(\d{2}|xxxl|xxl|xl|xs|s|m|l)\b/i
  )

  if (colorSizeMatch) {
    return {
      productColor: toTitleCase(colorSizeMatch[1]),
      productSize: colorSizeMatch[2].toUpperCase(),
    }
  }

  const explicitSizeMatch = normalized.match(
    /(?:size|ဆိုဒ်)\s*[:.\-]?\s*(\d{2}|xxxl|xxl|xl|xs|s|m|l)|(\d{2}|xxxl|xxl|xl|xs|s|m|l)\s*[:.\-]?\s*(?:size|ဆိုဒ်)/i
  )
  const colorMatch = normalized.match(
    new RegExp(`\\b(${colorWords.join("|")})\\b`, "i")
  )
  const productSize = explicitSizeMatch
    ? (explicitSizeMatch[1] || explicitSizeMatch[2]).toUpperCase()
    : ""

  return {
    productColor: colorMatch ? toTitleCase(colorMatch[1]) : "",
    productSize,
  }
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function parseCustomerMessage(text: string) {
  return text
    .split(/\n+/)
    .map(normalizeOcrLine)
    .filter((line) => /[\u1000-\u109f]/.test(line))
    .slice(-3)
    .join("\n")
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

async function extractScreenshotOrderData(
  file: File,
  dataUrl: string,
  onProgress: (message: string) => void
): Promise<ScreenshotExtraction> {
  const image = await getImageElement(dataUrl)
  const productBounds = findLikelyProductBounds(image)
  const productPhotoDataUrl = getImageDataUrl(image, productBounds) || dataUrl
  const { createWorker, PSM } = await import("tesseract.js")
  const workerOptions = {
    logger: (message: { status?: string; progress?: number }) => {
      if (message.status) {
        onProgress(
          `${message.status}${message.progress ? ` ${Math.round(message.progress * 100)}%` : ""}`
        )
      }
    },
  }
  let worker: Awaited<ReturnType<typeof createWorker>>

  try {
    worker = await createWorker("eng+mya", 1, workerOptions)
  } catch {
    worker = await createWorker("eng", 1, workerOptions)
  }

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    })

    onProgress("Reading customer name...")
    const nameResult = await worker.recognize(file, {
      rectangle: {
        left: Math.round(image.naturalWidth * 0.12),
        top: Math.round(image.naturalHeight * 0.04),
        width: Math.round(image.naturalWidth * 0.76),
        height: Math.round(image.naturalHeight * 0.22),
      },
    })

    onProgress("Reading order details...")
    const detailResult = await worker.recognize(file, {
      rectangle: {
        left: Math.round(image.naturalWidth * 0.15),
        top: Math.round(image.naturalHeight * 0.28),
        width: Math.round(image.naturalWidth * 0.82),
        height: Math.round(image.naturalHeight * 0.5),
      },
    })
    const fullResult = await worker.recognize(file)
    const fullText = fullResult.data.text
    const detailText = detailResult.data.text
    const details = parseSizeAndColor(`${detailText}\n${fullText}`)

    return {
      customerName: parseCustomerName(nameResult.data.text || fullText),
      productSize: details.productSize,
      productColor: details.productColor,
      customerMessage: parseCustomerMessage(fullText),
      productPhotoDataUrl,
      ocrText: `${detailText}\n${fullText}`.trim(),
    }
  } finally {
    await worker.terminate()
  }
}

export default function CreateOrderPage() {
  const router = useRouter()
  const extractionIdRef = useRef(0)

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const [customerName, setCustomerName] = useState("")
  const [facebookName, setFacebookName] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [productName, setProductName] = useState("")
  const [productSize, setProductSize] = useState("")
  const [productColor, setProductColor] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [costPriceThb, setCostPriceThb] = useState("")
  const [sellingPriceThb, setSellingPriceThb] = useState("")
  const [customerMessage, setCustomerMessage] = useState("")
  const [paymentStatus, setPaymentStatus] =
    useState<LocalOrder["paymentStatus"]>("not_paid")
  const [deliveryStatus, setDeliveryStatus] =
    useState<LocalOrder["deliveryStatus"]>("not_arranged")
  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState("")
  const [orderScreenshotPreview, setOrderScreenshotPreview] = useState("")
  const [ocrStatus, setOcrStatus] = useState("")
  const [ocrText, setOcrText] = useState("")

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
    setOcrStatus("")
    setOcrText("")

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a product photo.")
      setProductPhotoFile(null)
      event.target.value = ""
      return
    }

    try {
      const screenshotDataUrl = await readFileAsDataUrl(file)
      setOrderScreenshotPreview(screenshotDataUrl)
      setProductPhotoPreview(screenshotDataUrl)
      setOcrStatus("Preparing screenshot...")

      const extraction = await extractScreenshotOrderData(
        file,
        screenshotDataUrl,
        (message) => {
          if (extractionIdRef.current === extractionId) {
            setOcrStatus(message)
          }
        }
      )

      if (extractionIdRef.current !== extractionId) return

      setProductPhotoPreview(extraction.productPhotoDataUrl)
      setOcrText(extraction.ocrText)
      setCustomerName((value) => value || extraction.customerName)
      setFacebookName((value) => value || extraction.customerName)
      setProductSize((value) => value || extraction.productSize)
      setProductColor((value) => value || extraction.productColor)
      setCustomerMessage((value) => value || extraction.customerMessage)
      setProductDescription((value) => {
        if (value) return value

        const parts = [
          extraction.productColor && `Color: ${extraction.productColor}`,
          extraction.productSize && `Size: ${extraction.productSize}`,
        ].filter(Boolean)

        return parts.join("\n")
      })
      setOcrStatus("Screenshot details filled. Please review before saving.")
    } catch {
      try {
        const screenshotDataUrl = await readFileAsDataUrl(file)
        if (extractionIdRef.current !== extractionId) return
        setOrderScreenshotPreview(screenshotDataUrl)
        setProductPhotoPreview(screenshotDataUrl)
        setOcrStatus(
          "Could not read screenshot automatically. You can fill the fields manually."
        )
      } catch {
        setError("Could not preview the product photo. Please choose another image.")
        setProductPhotoFile(null)
        event.target.value = ""
      }
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

    if (!trimmedSize) {
      setError("Product size is required.")
      return
    }

    if (quantityNumber <= 0) {
      setError("Quantity must be at least 1.")
      return
    }

    setSaving(true)

    try {
      const existingOrders = getStoredOrders()
      const productPhotoDataUrl =
        productPhotoPreview || (await readFileAsDataUrl(productPhotoFile))
      const orderScreenshotDataUrl =
        orderScreenshotPreview || productPhotoDataUrl

      const totalRetailerCostThb = costPriceNumber * quantityNumber
      const totalCustomerPayableThb = sellingPriceNumber * quantityNumber

      const newOrder: LocalOrder = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`,

        orderNumber: createOrderNumber(existingOrders.length),
        customerName: customerName.trim() || "Customer order",

        orderStatus: "new_order",
        paymentStatus,
        deliveryStatus,

        baseCurrency: "THB",
        customerCurrency: "MMK",
        exchangeRateThbToMmk: 1,

        totalRetailerCostThb,
        totalCustomerPayableThb,
        totalPaidThb: 0,
        remainingBalanceThb: totalCustomerPayableThb,
        profitThb: totalCustomerPayableThb - totalRetailerCostThb,

        createdAt: new Date().toISOString(),

        facebookName: facebookName.trim(),
        phone: phone.trim(),
        address: location.trim(),

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
        retailerUnitPriceThb: costPriceNumber,
        sellingUnitPriceThb: sellingPriceNumber,
        productPhotoName: productPhotoFile.name,
        productPhotoDataUrl,
        orderScreenshotName: productPhotoFile.name,
        orderScreenshotDataUrl,
      }

      const updatedOrders = [newOrder, ...existingOrders]

      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(updatedOrders)
      )

      router.push("/orders")
    } catch {
      setError("Could not save order. Please try a smaller product photo.")
    } finally {
      setSaving(false)
    }
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
              Upload the Messenger screenshot. The product image and customer
              details will be extracted where possible.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              className="rounded-xl"
              onChange={handleProductPhotoChange}
            />

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

                {ocrStatus ? (
                  <div className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                    <IconSparkles className="mt-0.5 size-4 shrink-0" />
                    <span>{ocrStatus}</span>
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
              Customer Info
            </CardTitle>
            <CardDescription>
              Add these when the customer sends them.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer name"
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebookName">Facebook name</Label>
              <Input
                id="facebookName"
                value={facebookName}
                onChange={(event) => setFacebookName(event.target.value)}
                placeholder="Facebook display name"
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Textarea
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Customer delivery location"
                className="min-h-24 rounded-xl text-base"
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="productName">Product name</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Nike Air Force 1, dress, bag..."
                className="h-12 rounded-xl text-base"
              />
            </div>

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
              <div className="space-y-2">
                <Label htmlFor="productSize">Size / variant *</Label>
                <Input
                  id="productSize"
                  value={productSize}
                  onChange={(event) => setProductSize(event.target.value)}
                  placeholder="XS, 42, L..."
                  className="h-12 rounded-xl text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productColor">Color</Label>
                <Input
                  id="productColor"
                  value={productColor}
                  onChange={(event) => setProductColor(event.target.value)}
                  placeholder="White, black..."
                  className="h-12 rounded-xl text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="h-12 rounded-xl text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPriceThb">Cost price (฿)</Label>
                <Input
                  id="costPriceThb"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={costPriceThb}
                  onChange={(event) => setCostPriceThb(event.target.value)}
                  placeholder="0"
                  className="h-12 rounded-xl text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPriceThb">Selling price (฿)</Label>
              <Input
                id="sellingPriceThb"
                type="number"
                inputMode="decimal"
                min="0"
                value={sellingPriceThb}
                onChange={(event) => setSellingPriceThb(event.target.value)}
                placeholder="0"
                className="h-12 rounded-xl text-base"
              />
            </div>

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

            {ocrText ? (
              <details className="rounded-xl border bg-background px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  OCR text
                </summary>
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {ocrText}
                </pre>
              </details>
            ) : null}
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
              <Label>Payment status</Label>
              <Select
                value={paymentStatus}
                onValueChange={(value) =>
                  setPaymentStatus(value as LocalOrder["paymentStatus"])
                }
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_paid">Not Paid</SelectItem>
                  <SelectItem value="receiving">Receiving</SelectItem>
                  <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="fully_paid">Fully Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Delivery status</Label>
              <Select
                value={deliveryStatus}
                onValueChange={(value) =>
                  setDeliveryStatus(value as LocalOrder["deliveryStatus"])
                }
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_arranged">Not Arranged</SelectItem>
                  <SelectItem value="product_bought">
                    Product Already Bought
                  </SelectItem>
                  <SelectItem value="waiting_pickup">Waiting Pickup</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="sent_to_cargo">Sent To Cargo</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
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
