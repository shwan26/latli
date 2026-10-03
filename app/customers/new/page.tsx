// app/customers/new/page.tsx

"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react"

import { RequiredMark } from "@/components/field-error"
import { Button } from "@/components/ui/button"
import { CustomerForm, type CustomerDraft } from "@/components/customer-form"
import {
  emptyCustomerDraft,
  getCustomerKey,
} from "../../lib/local-customers"
import { insertCustomer, listCustomers } from "@/lib/db/customers"
import { messageOf } from "@/lib/db/shared"
import { useI18n } from "@/lib/i18n/provider"

export default function AddCustomerPage() {
  const { t } = useI18n()
  const router = useRouter()

  const [draft, setDraft] = useState<CustomerDraft>(emptyCustomerDraft)
  const [errorMessage, setErrorMessage] = useState("")
  const [saving, setSaving] = useState(false)

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

    if (!input.name) {
      setErrorMessage(t("Enter the customer's name."))
      return
    }

    setSaving(true)

    try {
      const key = getCustomerKey(input)
      const saved = await listCustomers()

      if (saved.some((existing) => getCustomerKey(existing) === key)) {
        setErrorMessage(t("A customer with this phone, Facebook or name is already saved."))
        setSaving(false)
        return
      }

      await insertCustomer(input)
      router.push("/customers")
    } catch (error) {
      setErrorMessage(messageOf(error, t("Could not save the customer.")))
      setSaving(false)
    }
  }

  return (
    <main className="min-h-dvh bg-muted pb-28">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/customers" aria-label={t("Back to customers")}>
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>

          <div>
            <p className="text-sm text-muted-foreground">{t("Customers")}</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Add Customer")}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-5 pb-40 pt-5">
        <p className="text-xs text-muted-foreground">
          <RequiredMark /> {t("required")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("Orders with the same phone, Facebook or name are linked to this customer.")}
        </p>

        <CustomerForm
          formId="add-customer-form"
          idPrefix="add-customer"
          draft={draft}
          onChange={updateDraft}
          onSubmit={handleAddCustomer}
          submitLabel=""
          errorMessage=""
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-5 pb-5 pt-3 backdrop-blur">
        {errorMessage ? (
          <p role="alert" className="mx-auto mb-2 w-full max-w-md text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <div className="mx-auto flex w-full max-w-md gap-3">
          <Button asChild variant="outline" className="h-12 flex-1 rounded-xl">
            <Link href="/customers">{t("Cancel")}</Link>
          </Button>
          <Button
            type="submit"
            form="add-customer-form"
            className="h-12 flex-1 rounded-xl"
            disabled={saving}
          >
            <IconDeviceFloppy className="mr-2 size-5" />
            {saving ? t("Saving...") : t("Add Customer")}
          </Button>
        </div>
      </div>
    </main>
  )
}
