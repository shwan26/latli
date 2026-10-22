"use client"

import { IconMinus, IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/provider"

// Optional fields behind a "+" row. Open, the fields show with a "-" row to
// hide them again. Hiding keeps what was typed, so `hasValue` adds a hint to
// the "+" row when something hidden is filled in.
export function OptionalSection({
  label,
  open,
  onOpenChange,
  hasValue = false,
  children,
}: {
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  hasValue?: boolean
  children: React.ReactNode
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      {open ? (
        <>
          {children}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 rounded-xl text-muted-foreground"
            aria-expanded
            onClick={() => onOpenChange(false)}
          >
            <IconMinus className="mr-1 size-4" />
            {t("Hide")}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 rounded-xl text-muted-foreground"
          aria-expanded={false}
          onClick={() => onOpenChange(true)}
        >
          <IconPlus className="mr-1 size-4" />
          {label}
          {hasValue ? ` · ${t("filled")}` : ""}
        </Button>
      )}
    </div>
  )
}
