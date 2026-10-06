// Translation lookup shared by components and plain code.
//
// Text is looked up by its English wording, so English is always the fallback
// and a missing Burmese entry never breaks a page. Use {name} for values:
//   t("Hello {name}", { name })

import { my } from "./my"

export type Lang = "en" | "my"

export const LANG_COOKIE = "latli_lang"

export function parseLang(value: string | undefined | null): Lang {
  return value === "my" ? "my" : "en"
}

function fill(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text

  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  )
}

export function translateTo(
  lang: Lang,
  text: string,
  vars?: Record<string, string | number>
) {
  // Texts have no closing period, but messages from the database and Supabase
  // Auth still do, so a trailing "." is ignored when looking one up.
  const key = /[^.]\.$/.test(text) ? text.slice(0, -1) : text

  return fill(lang === "my" ? (my[text] ?? my[key] ?? text) : text, vars)
}

// The language of the page that is open in this browser. Components should use
// useI18n() so they redraw on a switch. This is for code that has no hook, such
// as the data layer's error messages. Never use it on the server.
let currentLang: Lang = "en"

export function setRuntimeLang(lang: Lang) {
  currentLang = lang
}

export function translate(
  text: string,
  vars?: Record<string, string | number>
) {
  return translateTo(currentLang, text, vars)
}

// Locale for dates, so months show in Burmese when the app is in Burmese.
// Numbers and money stay in Latin digits.
export function dateLocale() {
  return currentLang === "my" ? "my-MM" : "en-US"
}
