"use client"

import { useI18n } from "@/lib/i18n/provider"
import { cn } from "@/lib/utils"

// ENG | MM switch. The whole app changes language at once. It is in Settings
// (the More page) and on the public pages.
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t("Language")}
      className={cn("inline-flex rounded-xl border bg-background p-0.5", className)}
    >
      {(
        [
          ["en", "ENG"],
          ["my", "MM"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => setLang(value)}
          className={cn(
            "h-8 min-w-12 rounded-[10px] px-3 text-xs font-medium transition",
            lang === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
