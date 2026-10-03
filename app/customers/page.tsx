// app/customers/page.tsx

"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { IconPlus, IconSearch, IconUsers } from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CustomerForm, type CustomerDraft } from "@/components/customer-form"
import { formatBaht } from "../lib/currency"
import {
  buildCustomerSummaries,
  emptyCustomerDraft,
  getCustomerKey,
  type CustomerSummary,
  type LocalCustomer,
} from "../lib/local-customers"
import { type LocalOrder } from "../lib/local-orders"
import { insertCustomer, listCustomers } from "@/lib/db/customers"
import { listOrders } from "@/lib/db/orders"
import { messageOf } from "@/lib/db/shared"

type SortKey = "name" | "newest" | "orders" | "amount"

export default function CustomersPage() {
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [customers, setCustomers] = useState<LocalCustomer[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("amount")
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<CustomerDraft>(emptyCustomerDraft)
  const [errorMessage, setErrorMessage] = useState("")
  const [loadError, setLoadError] = useState("")
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
        setCustomers(loadedCustomers)
      } catch (error) {
        if (!cancelled) setLoadError(messageOf(error, "Could not load customers."))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const summaries = useMemo(
    () => buildCustomerSummaries(customers, orders),
    [customers, orders]
  )

  const visibleSummaries = useMemo(() => {
    const query = search.trim().toLowerCase()

    return summaries
      .filter(
        (customer) =>
          !query ||
          [
            customer.name,
            customer.facebookName,
            customer.phone,
            customer.address,
            customer.otherContacts,
          ].some((value) => value.toLowerCase().includes(query))
      )
      .sort((a, b) => {
        switch (sort) {
          case "name":
            return a.name.localeCompare(b.name)
          case "newest":
            return b.createdAt.localeCompare(a.createdAt)
          case "orders":
            return b.orderCount - a.orderCount || a.name.localeCompare(b.name)
          default:
            return b.totalThb - a.totalThb || a.name.localeCompare(b.name)
        }
      })
  }, [summaries, search, sort])

  function openAddCustomer() {
    setDraft(emptyCustomerDraft)
    setErrorMessage("")
    setAdding(true)
  }

  function updateDraft(key: keyof CustomerDraft, value: string) {
    setErrorMessage("")
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleAddCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const input = {
      name: draft.name.trim(),
      facebookName: draft.facebookName.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      otherContacts: draft.otherContacts.trim(),
    }

    const key = getCustomerKey(input)

    if (customers.some((existing) => getCustomerKey(existing) === key)) {
      setErrorMessage("A customer with this phone, Facebook or name is already saved.")
      return
    }

    setSaving(true)

    try {
      const customer = await insertCustomer(input)

      setCustomers((current) => [...current, customer])
      setAdding(false)
    } catch (error) {
      setErrorMessage(messageOf(error, "Could not save the customer."))
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading customers...</p>
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
              {summaries.length} customer{summaries.length === 1 ? "" : "s"}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Customers
            </h1>
          </div>

          <Button
            type="button"
            size="icon"
            className="size-11 rounded-xl"
            aria-label="Add customer"
            onClick={openAddCustomer}
          >
            <IconPlus className="size-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-5 py-5">
        {loadError ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, Facebook..."
              aria-label="Search customers"
              className="h-12 rounded-xl bg-background pl-10 text-base"
            />
          </div>

          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger
              className="h-12 rounded-xl bg-background"
              aria-label="Sort customers"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">Highest amount</SelectItem>
              <SelectItem value="orders">Most orders</SelectItem>
              <SelectItem value="name">A to Z</SelectItem>
              <SelectItem value="newest">Latest created</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {visibleSummaries.length === 0 ? (
          <Card className="rounded-[20px] shadow-none">
            <CardContent className="p-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <IconUsers className="size-7 text-muted-foreground" />
              </div>
              <h2 className="mt-4 font-heading text-lg font-medium">
                No customers found
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tap + to add a customer.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-[20px] shadow-none">
            <ul className="divide-y">
              {visibleSummaries.map((customer) => (
                <CustomerRow key={customer.key} customer={customer} />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle className="font-heading text-xl">Add Customer</SheetTitle>
            <SheetDescription>
              Orders with the same phone, Facebook or name are linked to this
              customer.
            </SheetDescription>
          </SheetHeader>

          <CustomerForm
            idPrefix="add-customer"
            draft={draft}
            onChange={updateDraft}
            onSubmit={handleAddCustomer}
            submitLabel={saving ? "Saving..." : "Add Customer"}
            errorMessage={errorMessage}
          />
        </SheetContent>
      </Sheet>

      <BottomNavigation active="customers" />
    </main>
  )
}

function CustomerRow({ customer }: { customer: CustomerSummary }) {
  return (
    <li>
      <Link
        href={`/customers/${encodeURIComponent(customer.key)}`}
        className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/60 active:bg-muted"
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{customer.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
          </p>
        </div>
        <p className="shrink-0 font-semibold">{formatBaht(customer.totalThb)}</p>
      </Link>
    </li>
  )
}
