"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n/provider"

// Drop-down version of the language switch, for the Settings list on the More
// page. The whole app changes language at once.
// `compact` shows just "EN" / "MM" and a narrow trigger, for the public navbar.
export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n()

  return (
    <Select value={lang} onValueChange={(value) => setLang(value as "en" | "my")}>
      <SelectTrigger
        aria-label={t("Language")}
        className={compact ? "h-9 w-auto gap-1 rounded-lg px-2 text-xs" : "h-10 w-32 rounded-xl"}
      >
        <SelectValue>{compact ? (lang === "en" ? "EN" : "MM") : undefined}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{compact ? "EN" : "English"}</SelectItem>
        <SelectItem value="my">{compact ? "MM" : "မြန်မာ"}</SelectItem>
      </SelectContent>
    </Select>
  )
}
