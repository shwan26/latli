import type { FormEvent } from "react"
import { IconPlus } from "@tabler/icons-react"

import { RequiredMark } from "@/components/field-error"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n/provider"

export type CustomerDraft = {
  name: string
  facebookName: string
  phone: string
  address: string
  otherContacts: string
}

export function CustomerForm({
  draft,
  onChange,
  onSubmit,
  submitLabel,
  errorMessage,
  idPrefix,
  formId,
}: {
  draft: CustomerDraft
  onChange: (key: keyof CustomerDraft, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitLabel: string
  errorMessage: string
  idPrefix: string
  // For a full page: no padding and no button, the page's own Save button
  // submits the form through this id.
  formId?: string
}) {
  const { t } = useI18n()

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={formId ? "space-y-4" : "space-y-4 p-4"}
    >
      {errorMessage ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>
          {t("Name")}
          <RequiredMark />
        </Label>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder={t("Customer name")}
          required
          className="h-12 rounded-xl text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-facebook`}>{t("Facebook")}</Label>
        <Input
          id={`${idPrefix}-facebook`}
          value={draft.facebookName}
          onChange={(event) => onChange("facebookName", event.target.value)}
          placeholder={t("Facebook name")}
          className="h-12 rounded-xl text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>{t("Phone number")}</Label>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          value={draft.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          placeholder={t("Phone number")}
          className="h-12 rounded-xl text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-address`}>{t("Address")}</Label>
        <Textarea
          id={`${idPrefix}-address`}
          value={draft.address}
          onChange={(event) => onChange("address", event.target.value)}
          placeholder={t("Delivery address")}
          className="min-h-24 rounded-xl text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-other`}>{t("Other contacts")}</Label>
        <Textarea
          id={`${idPrefix}-other`}
          value={draft.otherContacts}
          onChange={(event) => onChange("otherContacts", event.target.value)}
          placeholder={t("Viber, Telegram, second phone")}
          className="min-h-20 rounded-xl text-base"
        />
      </div>

      {formId ? null : (
        <Button type="submit" className="h-12 w-full rounded-xl">
          <IconPlus className="mr-2 size-5" />
          {submitLabel}
        </Button>
      )}
    </form>
  )
}
