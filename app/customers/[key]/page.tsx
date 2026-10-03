// app/customers/[key]/page.tsx

"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { IconArrowLeft, IconPencil, IconTrash } from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CustomerForm, type CustomerDraft } from "@/components/customer-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type LocalOrder,
} from "../../lib/local-orders"
import {
  buildCustomerSummaries,
  getCustomerKey,
  getOrderCustomerKey,
  type LocalCustomer,
} from "../../lib/local-customers"
import {
  deleteCustomer,
  insertCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/db/customers"
import { listOrders, updateOrdersCustomer } from "@/lib/db/orders"
import { messageOf } from "@/lib/db/shared"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatBaht, formatKyat } from "../../lib/currency"

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return "CU"

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

function formatDate(value: string) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "returned" || status === "refunded") return "destructive"

  if (status === "complete" || status === "delivered" || status === "fully_paid") {
    return "default"
  }

  if (status === "not_paid" || status === "not_bought") return "outline"

  return "secondary"
}

export default function CustomerDetailsPage() {
  const router = useRouter()
  const params = useParams<{ key: string }>()
  const customerKey = decodeURIComponent(params.key)

  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [savedCustomers, setSavedCustomers] = useState<LocalCustomer[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CustomerDraft>({
    name: "",
    facebookName: "",
    phone: "",
    address: "",
    otherContacts: "",
  })
  const [errorMessage, setErrorMessage] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pageError, setPageError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [loadedOrders, loadedCustomers] = await Promise.all([
          listOrders(),
          listCustomers(),
        ])

        if (cancelled) return

        setOrders(loadedOrders)
        setSavedCustomers(loadedCustomers)
      } catch (error) {
        if (!cancelled) setPageError(messageOf(error, "Could not load the customer."))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const customerOrders = useMemo(
    () =>
      orders
        .filter((order) => getOrderCustomerKey(order) === customerKey)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [customerKey, orders]
  )

  const summary = useMemo(
    () =>
      buildCustomerSummaries(savedCustomers, orders).find(
        (customer) => customer.key === customerKey
      ),
    [customerKey, orders, savedCustomers]
  )


  function startEditing() {
    if (!summary) return

    setDraft({
      name: summary.name,
      facebookName: summary.facebookName,
      phone: summary.phone,
      address: summary.address,
      otherContacts: summary.otherContacts,
    })
    setErrorMessage("")
    setEditing(true)
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!summary) return

    const existing = savedCustomers.find(
      (customer) => getCustomerKey(customer) === summary.key
    )
    const input = {
      name: draft.name.trim(),
      facebookName: draft.facebookName.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      otherContacts: draft.otherContacts.trim(),
    }
    const nextKey = getCustomerKey(input)

    if (
      savedCustomers.some(
        (customer) =>
          customer.id !== existing?.id && getCustomerKey(customer) === nextKey
      )
    ) {
      setErrorMessage("Another customer already uses this phone, Facebook or name.")
      return
    }

    setSaving(true)

    let saved: LocalCustomer

    try {
      saved = existing
        ? await updateCustomer(existing.id, input)
        : await insertCustomer(input)
    } catch (error) {
      setErrorMessage(messageOf(error, "Could not save the customer."))
      setSaving(false)
      return
    }

    setSavedCustomers((current) =>
      existing
        ? current.map((customer) => (customer.id === saved.id ? saved : customer))
        : [...current, saved]
    )

    // Orders are linked by phone, Facebook or name, so their copy of the
    // customer details is updated too and they stay linked after the edit.
    const orderIds = customerOrders.map((order) => order.id)

    try {
      await updateOrdersCustomer(orderIds, input)
    } catch (error) {
      setErrorMessage(
        `The customer was saved, but their orders were not updated. ${messageOf(error, "")}`
      )
      setSaving(false)
      return
    }

    setOrders((current) =>
      current.map((order) =>
        orderIds.includes(order.id)
          ? {
              ...order,
              customerName: input.name,
              facebookName: input.facebookName,
              phone: input.phone,
              address: input.address,
            }
          : order
      )
    )
    setSaving(false)
    setEditing(false)

    if (nextKey !== summary.key) {
      router.replace(`/customers/${encodeURIComponent(nextKey)}`)
    }
  }

  async function handleDelete() {
    if (!summary) return

    const existing = savedCustomers.find(
      (customer) => getCustomerKey(customer) === summary.key
    )

    setConfirmingDelete(false)

    if (!existing) return

    try {
      await deleteCustomer(existing.id)
    } catch (error) {
      setPageError(messageOf(error, "Could not delete the customer."))
      return
    }

    router.push("/customers")
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading customer...</p>
        </div>
      </main>
    )
  }

  if (!summary) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/customers">
              <IconArrowLeft className="mr-2 size-5" />
              Back to customers
            </Link>
          </Button>
          <Card className="rounded-[20px] shadow-none">
            <CardContent className="p-6 text-center">
              <h1 className="font-heading text-xl font-medium">
                Customer not found
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This customer is not saved and has no orders.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/customers" aria-label="Back to customers">
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Customer</p>
            <h1 className="truncate font-heading text-2xl font-medium tracking-tight">
              {summary.name}
            </h1>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            aria-label="Edit customer"
            onClick={startEditing}
          >
            <IconPencil className="size-5" />
          </Button>

          {summary.saved ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl text-destructive hover:text-destructive"
              aria-label="Delete customer"
              onClick={() => setConfirmingDelete(true)}
            >
              <IconTrash className="size-5" />
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        {pageError ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-[20px] shadow-none">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary text-lg text-primary-foreground">
                  {getInitials(summary.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate font-heading text-xl font-medium">
                  {summary.name}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {summary.facebookName || summary.phone || "No contact saved"}
                </p>
              </div>
            </div>

            {summary.phone && summary.facebookName ? (
              <p className="text-sm text-muted-foreground">{summary.phone}</p>
            ) : null}

            {summary.address ? (
              <div className="rounded-2xl bg-muted p-3">
                <p className="text-[11px] text-muted-foreground">Address</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{summary.address}</p>
              </div>
            ) : null}

            {summary.otherContacts ? (
              <div className="rounded-2xl bg-muted p-3">
                <p className="text-[11px] text-muted-foreground">Other contacts</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {summary.otherContacts}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <AmountBox label="Total" value={formatBaht(summary.totalThb)} />
              <AmountBox label="MMK" value={formatKyat(summary.totalMmk)} />
              <AmountBox
                label="Unpaid"
                value={formatBaht(summary.unpaidThb)}
              />
              <AmountBox
                label="Orders"
                value={`${customerOrders.length}`}
              />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">Orders Bought</h2>
            <Badge variant="secondary">{customerOrders.length}</Badge>
          </div>

          {customerOrders.length === 0 ? (
            <Card className="rounded-[20px] shadow-none">
              <CardContent className="p-5 text-sm text-muted-foreground">
                No orders yet.
              </CardContent>
            </Card>
          ) : (
            customerOrders.map((order) => (
              <CustomerOrderRow key={order.id} order={order} />
            ))
          )}
        </section>
      </div>


      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle className="font-heading text-xl">Edit Customer</SheetTitle>
            <SheetDescription>
              {summary.saved
                ? "Saving also updates the details on this customer's orders."
                : "Saving adds this customer to your saved customers and updates the details on their orders."}
            </SheetDescription>
          </SheetHeader>

          <CustomerForm
            idPrefix="edit-customer"
            draft={draft}
            onChange={(key, value) => {
              setErrorMessage("")
              setDraft((current) => ({ ...current, [key]: value }))
            }}
            onSubmit={handleSaveEdit}
            submitLabel={saving ? "Saving..." : "Save"}
            errorMessage={errorMessage}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {summary.name}?</DialogTitle>
            <DialogDescription>
              {customerOrders.length > 0
                ? `This removes the saved customer. Their ${customerOrders.length} order${customerOrders.length === 1 ? "" : "s"} stay and the customer still shows in the list because of them.`
                : "This removes the saved customer."}
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
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation active="customers" />
    </main>
  )
}

function CustomerOrderRow({ order }: { order: LocalOrder }) {
  return (
    <Link href={`/orders/${order.id}`} className="block">
      <Card className="rounded-[20px] shadow-none transition active:scale-[0.99]">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {order.orderNumber} · {formatDate(order.createdAt)}
              </p>
              <h3 className="mt-1 truncate font-medium">
                {order.productName || "Product photo order"}
              </h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {order.quantity ? `${order.quantity} item${order.quantity === 1 ? "" : "s"}` : "1 item"}
                {order.productSize || order.productOption
                  ? ` · Size ${order.productSize || order.productOption}`
                  : ""}
                {order.productColor ? ` · ${order.productColor}` : ""}
              </p>
            </div>

            <p className="shrink-0 text-sm font-semibold">
              {formatBaht(order.totalCustomerPayableThb)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Payment</p>
              <Badge
                variant={getStatusVariant(order.paymentStatus)}
                className="mt-1"
              >
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </Badge>
            </div>

            <div className="rounded-xl border bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Order status</p>
              <Badge
                variant={getStatusVariant(order.orderStatus)}
                className="mt-1"
              >
                {ORDER_STATUS_LABELS[order.orderStatus]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function AmountBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}
