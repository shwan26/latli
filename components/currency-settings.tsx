"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UpgradeLink } from "@/components/upgrade-link"
import { RichText } from "@/components/rich-text"
import { CURRENCIES, type Currency } from "@/app/lib/local-orders"
import {
  canUseSecondCurrency,
  saveCurrencySettings,
  type ProfileSettings,
} from "@/lib/profile"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/provider"

type Props = {
  profile: ProfileSettings
  onSaved: (profile: ProfileSettings) => void
}

const ROW =
  "flex min-h-16 items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-3"

// Currency rows for the Settings list on the More page. Each drop-down saves
// as soon as it changes. Primary currency is for everyone. Pro accounts can add
// a second currency and a default exchange rate (1 primary = N second).
export function CurrencySettings({ profile, onSaved }: Props) {
  const { t } = useI18n()

  const [draft, setDraft] = useState(profile)
  const [rateText, setRateText] = useState(
    profile.defaultExchangeRate === null ? "" : String(profile.defaultExchangeRate)
  )
  const [error, setError] = useState("")

  const pro = canUseSecondCurrency(draft)

  async function apply(next: ProfileSettings) {
    setDraft(next)
    setError("")

    // Wait for a rate before saving a second currency.
    if (
      canUseSecondCurrency(next) &&
      next.secondaryCurrency &&
      !(next.defaultExchangeRate && next.defaultExchangeRate > 0)
    ) {
      return
    }

    const saveError = await saveCurrencySettings(createClient(), next)

    if (saveError) {
      setError(t(saveError))
      return
    }

    onSaved(next)
  }

  function handleRateBlur() {
    const rate = rateText.trim() === "" ? null : Number(rateText)

    if (rate !== null && !(rate > 0)) {
      setError(t("Enter an exchange rate greater than 0."))
      return
    }

    if (rate === draft.defaultExchangeRate) return

    void apply({ ...draft, defaultExchangeRate: rate })
  }

  return (
    <>
      <div className={ROW}>
        <span className="text-sm font-medium">{t("Primary currency")}</span>
        <Select
          value={draft.baseCurrency}
          onValueChange={(value) =>
            void apply({
              ...draft,
              baseCurrency: value as Currency,
              secondaryCurrency:
                draft.secondaryCurrency === value ? null : draft.secondaryCurrency,
            })
          }
        >
          <SelectTrigger aria-label={t("Primary currency")} className="h-10 w-32 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={ROW}>
        <span className="text-sm font-medium">{t("Second currency")}</span>
        <Select
          value={draft.secondaryCurrency ?? "none"}
          disabled={!pro}
          onValueChange={(value) => {
            if (value === "none") setRateText("")

            void apply({
              ...draft,
              secondaryCurrency: value === "none" ? null : (value as Currency),
              defaultExchangeRate: value === "none" ? null : draft.defaultExchangeRate,
            })
          }}
        >
          <SelectTrigger aria-label={t("Second currency")} className="h-10 w-32 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("None")}</SelectItem>
            {CURRENCIES.filter((code) => code !== draft.baseCurrency).map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pro && draft.secondaryCurrency ? (
        <div className={ROW}>
          <span className="text-sm font-medium">
            {`1 ${draft.baseCurrency} =`}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0"
              aria-label={t("Default exchange rate")}
              value={rateText}
              onChange={(event) => setRateText(event.target.value)}
              onBlur={handleRateBlur}
              className="h-10 w-24 rounded-xl text-base"
            />
            <span className="text-sm text-muted-foreground">
              {draft.secondaryCurrency}
            </span>
          </div>
        </div>
      ) : null}

      {pro ? null : (
        <p className="text-xs text-muted-foreground">
          {t("A second currency with an exchange rate is a Pro feature.")}{" "}
          <RichText
            text={t("Want Pro? Contact {email}.")}
            parts={{ email: <UpgradeLink account={draft} /> }}
          />
        </p>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  )
}
