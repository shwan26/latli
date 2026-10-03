// app/orders/[id]/page.tsx

"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
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
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type LocalOrder,
} from "../../lib/local-orders"
import { getOrder, updateOrder } from "@/lib/db/orders"
import {
  getPhotoExpiry,
  getPhotoUrls,
  keepPhotosLonger,
  removePhotos,
  uploadPhoto,
} from "@/lib/db/photos"
import { fetchProfile } from "@/lib/profile"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { messageOf } from "@/lib/db/shared"
import { resizeImageToDataUrl } from "../../lib/image-resize"

function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatBaht(value: number) {
  return `฿${Math.round(value || 0).toLocaleString("en-US")}`
}

export default function OrderDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const orderId = params.id

  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState("")
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
  // A newly chosen photo (data URL) waiting to be uploaded on save.
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState("")
  const [newPhotoName, setNewPhotoName] = useState("")
  const [savedPhotoUrl, setSavedPhotoUrl] = useState("")
  const [photoExpiresAt, setPhotoExpiresAt] = useState("")
  const [isPro, setIsPro] = useState(false)
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

          const path = storedOrder.productPhotoPath || storedOrder.orderScreenshotPath
          const [urls, expiry, profile] = await Promise.all([
            getPhotoUrls([path]),
            getPhotoExpiry([
              storedOrder.productPhotoPath,
              storedOrder.orderScreenshotPath,
            ]),
            isSupabaseConfigured ? fetchProfile(createClient()) : null,
          ])

          if (cancelled) return

          if (path) setSavedPhotoUrl(urls[path] ?? "")
          setIsPro(profile?.plan === "pro")
          // Show the earliest date, since that is when the first photo goes.
          setPhotoExpiresAt(Object.values(expiry).sort()[0] ?? "")
        }
      } catch (loadError) {
        if (!cancelled) setError(messageOf(loadError, "Could not load the order."))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [orderId])

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
      setError("Please upload a product photo.")
      event.target.value = ""
      return
    }

    try {
      setNewPhotoDataUrl(await resizeImageToDataUrl(file, 1600, 0.8))
      setNewPhotoName(file.name)
    } catch {
      setError("Could not preview the product photo. Please choose another image.")
      event.target.value = ""
    }
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
      setError(messageOf(keepError, "Could not keep the photos longer."))
    } finally {
      setKeeping(false)
    }
  }

  async function handleSaveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (!order) {
      setError("Order could not be found.")
      return
    }

    const trimmedSize = productSize.trim()
    const quantityNumber = Math.max(toNumber(quantity), 0)

    if (!trimmedSize) {
      setError("Product size is required.")
      return
    }

    if (quantityNumber <= 0) {
      setError("Quantity must be at least 1.")
      return
    }

    setSaving(true)

    let uploadedPath: string | undefined

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
        uploadedPath = await uploadPhoto(newPhotoDataUrl, "orders")
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
        ...(uploadedPath
          ? {
              productPhotoName: newPhotoName,
              productPhotoPath: uploadedPath,
              orderScreenshotPath: undefined,
            }
          : {}),
      })

      // The replaced photos are no longer used.
      if (uploadedPath) {
        await removePhotos([order.productPhotoPath, order.orderScreenshotPath])
      }

      setOrder(updatedOrder)
      router.push("/orders")
    } catch (saveError) {
      await removePhotos([uploadedPath])
      setError(messageOf(saveError, "Could not save the order. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading order...</p>
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
              <IconArrowLeft className="mr-2 size-5" />
              Back to orders
            </Link>
          </Button>
          <Card className="rounded-[20px] shadow-none">
            <CardContent className="p-6 text-center">
              <h1 className="font-heading text-xl font-medium">
                Order not found
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This order may have been deleted.
              </p>
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
            <Link href="/orders" aria-label="Back to orders">
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">
              {order.orderNumber}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Order Details
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
            <CardDescription>View or replace the product photo.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="file"
              accept="image/*"
              className="rounded-xl"
              onChange={handleProductPhotoChange}
            />

            {newPhotoDataUrl || savedPhotoUrl ? (
              <div className="overflow-hidden rounded-2xl border bg-background">
                <Image
                  src={newPhotoDataUrl || savedPhotoUrl}
                  alt="Product photo"
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
                  {order.productPhotoName
                    ? "This photo expired and was deleted"
                    : "No product photo"}
                </p>
              </div>
            )}

            {order.productPhotoPath || order.orderScreenshotPath ? (
              <div className="space-y-2 rounded-xl border bg-background p-3">
                <p className="text-sm">
                  {photoExpiresAt
                    ? `Photos are deleted on ${new Date(photoExpiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.`
                    : "Photos are deleted 7 days after they are saved."}
                </p>
                {isPro ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl"
                    disabled={keeping}
                    onClick={handleKeepPhotos}
                  >
                    {keeping ? "Saving..." : "Keep photos for a month"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pro accounts can keep photos for a month.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconUser className="size-5 text-muted-foreground" />
              Customer Info
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <TextInput
              id="customerName"
              label="Customer name"
              value={customerName}
              onChange={setCustomerName}
              placeholder="Customer name"
            />
            <TextInput
              id="facebookName"
              label="Facebook name"
              value={facebookName}
              onChange={setFacebookName}
              placeholder="Facebook display name"
            />
            <TextInput
              id="phone"
              label="Phone number"
              value={phone}
              onChange={setPhone}
              placeholder="Phone number"
            />
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
          </CardHeader>

          <CardContent className="space-y-4">
            <TextInput
              id="productName"
              label="Product name"
              value={productName}
              onChange={setProductName}
              placeholder="Product name"
            />
            <div className="space-y-2">
              <Label htmlFor="productDescription">Description</Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Product description"
                className="min-h-24 rounded-xl text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                id="productSize"
                label="Size / variant *"
                value={productSize}
                onChange={setProductSize}
                placeholder="XS, 42, L..."
              />
              <TextInput
                id="productColor"
                label="Color"
                value={productColor}
                onChange={setProductColor}
                placeholder="White, black..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                id="quantity"
                label="Quantity"
                value={quantity}
                onChange={setQuantity}
                type="number"
                placeholder="1"
              />
              <TextInput
                id="costPriceThb"
                label="Cost price (฿)"
                value={costPriceThb}
                onChange={setCostPriceThb}
                type="number"
                placeholder="0"
              />
            </div>
            <TextInput
              id="sellingPriceThb"
              label="Selling price (฿)"
              value={sellingPriceThb}
              onChange={setSellingPriceThb}
              type="number"
              placeholder="0"
            />
            <div className="rounded-2xl bg-muted p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryItem
                  label="Customer total"
                  value={formatBaht(toNumber(sellingPriceThb) * toNumber(quantity))}
                />
                <SummaryItem
                  label="Profit"
                  value={formatBaht(
                    (toNumber(sellingPriceThb) - toNumber(costPriceThb)) *
                      toNumber(quantity)
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerMessage">Customer note</Label>
              <Textarea
                id="customerMessage"
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                placeholder="Optional note"
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
              Update payment and order progress.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <StatusSelect
              label="Payment status"
              value={paymentStatus}
              onChange={(value) =>
                setPaymentStatus(value as LocalOrder["paymentStatus"])
              }
              items={Object.entries(PAYMENT_STATUS_LABELS)}
            />
            <StatusSelect
              label="Order status"
              value={orderStatus}
              onChange={(value) =>
                setOrderStatus(value as LocalOrder["orderStatus"])
              }
              items={Object.entries(ORDER_STATUS_LABELS)}
            />
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
              {saving ? "Saving..." : "Save"}
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
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl text-base"
      />
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
