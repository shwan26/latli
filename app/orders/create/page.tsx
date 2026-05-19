// app/orders/create/page.tsx

"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconCamera,
  IconDeviceFloppy,
  IconMessage2,
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

export default function CreateOrderPage() {
  const router = useRouter()

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

  async function handleProductPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("")

    const file = event.target.files?.[0] ?? null
    setProductPhotoFile(file)
    setProductPhotoPreview("")

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
      setProductPhotoPreview(await readFileAsDataUrl(file))
    } catch {
      setError("Could not preview the product photo. Please choose another image.")
      setProductPhotoFile(null)
      event.target.value = ""
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
        orderScreenshotDataUrl: productPhotoDataUrl,
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
              Upload the photo the customer sent for the product.
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
