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
export function LanguageSelect() {
  const { lang, setLang, t } = useI18n()

  return (
    <Select value={lang} onValueChange={(value) => setLang(value as "en" | "my")}>
      <SelectTrigger aria-label={t("Language")} className="h-10 w-32 rounded-xl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="my">မြန်မာ</SelectItem>
      </SelectContent>
    </Select>
  )
}
