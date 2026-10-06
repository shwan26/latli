// app/shops/new/page.tsx

"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react"

import { RequiredMark } from "@/components/field-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { emptyShopDraft } from "../../lib/local-shops"
import { messageOf } from "@/lib/db/shared"
import { insertShop } from "@/lib/db/shops"
import { useI18n } from "@/lib/i18n/provider"

type ShopDraft = typeof emptyShopDraft

export default function AddShopPage() {
  const { t } = useI18n()
  const router = useRouter()

  const [draft, setDraft] = useState<ShopDraft>(emptyShopDraft)
  const [errorMessage, setErrorMessage] = useState("")
  const [saving, setSaving] = useState(false)

  function update(key: keyof ShopDraft, value: string) {
    setErrorMessage("")
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleAddShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.name.trim() || !draft.phone.trim() || !draft.location.trim()) {
      setErrorMessage(t("Fill in the shop name, phone or LINE, and location"))
      return
    }

    setSaving(true)

    try {
      await insertShop({ ...draft, name: draft.name.trim() })
      router.push("/shops")
    } catch (error) {
      setErrorMessage(messageOf(error, t("Could not save the shop")))
      setSaving(false)
    }
  }

  return (
    <main className="min-h-dvh bg-muted pb-28">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/shops" aria-label={t("Back to shops")}>
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>

          <div>
            <p className="text-sm text-muted-foreground">{t("Shops")}</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Add Shop")}</h1>
          </div>
        </div>
      </header>

      <form
        id="add-shop-form"
        onSubmit={handleAddShop}
        className="mx-auto w-full max-w-md space-y-4 px-5 pb-40 pt-5"
      >
        <p className="text-xs text-muted-foreground">
          <RequiredMark /> {t("required")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("Products can be added after the shop is saved")}
        </p>

        <div className="space-y-2">
          <Label htmlFor="shopName">
            {t("Shop name")}
            <RequiredMark />
          </Label>
          <Input
            id="shopName"
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder={t("Bangkok shop")}
            required
            className="h-12 rounded-xl text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shopOwner">{t("Contact name (optional)")}</Label>
          <Input
            id="shopOwner"
            value={draft.ownerName}
            onChange={(event) => update("ownerName", event.target.value)}
            placeholder={t("Contact name")}
            className="h-12 rounded-xl text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shopPhone">
            {t("Phone or LINE")}
            <RequiredMark />
          </Label>
          <Input
            id="shopPhone"
            type="tel"
            inputMode="tel"
            value={draft.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder={t("Phone number or LINE ID")}
            required
            className="h-12 rounded-xl text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shopLocation">
            {t("Location")}
            <RequiredMark />
          </Label>
          <Textarea
            id="shopLocation"
            value={draft.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder={t("Shop address, mall, market, or pickup location")}
            required
            className="min-h-24 rounded-xl text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shopNote">{t("Shop info (optional)")}</Label>
          <Textarea
            id="shopNote"
            value={draft.note}
            onChange={(event) => update("note", event.target.value)}
            placeholder={t("Opening hours, buying notes, payment terms")}
            className="min-h-24 rounded-xl text-base"
          />
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-5 pb-5 pt-3 backdrop-blur">
        {errorMessage ? (
          <p role="alert" className="mx-auto mb-2 w-full max-w-md text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <div className="mx-auto flex w-full max-w-md gap-3">
          <Button asChild variant="outline" className="h-12 flex-1 rounded-xl">
            <Link href="/shops">{t("Cancel")}</Link>
          </Button>
          <Button
            type="submit"
            form="add-shop-form"
            className="h-12 flex-1 rounded-xl"
            disabled={saving}
          >
            <IconDeviceFloppy className="mr-2 size-5" />
            {saving ? t("Saving...") : t("Add Shop")}
          </Button>
        </div>
      </div>
    </main>
  )
}
