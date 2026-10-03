"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  LANG_COOKIE,
  setRuntimeLang,
  translateTo,
  type Lang,
} from "./runtime"

type Translate = (text: string, vars?: Record<string, string | number>) => string

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translate
}

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (text, vars) => translateTo("en", text, vars),
})

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang
  children: React.ReactNode
}) {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>(() => {
    setRuntimeLang(initialLang)
    return initialLang
  })

  useEffect(() => {
    setRuntimeLang(lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback(
    (next: Lang) => {
      // The cookie lets server-rendered pages (Terms, Privacy, the landing
      // page) draw in the same language.
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      setRuntimeLang(next)
      setLangState(next)
      router.refresh()
    },
    [router]
  )

  const t = useCallback<Translate>(
    (text, vars) => translateTo(lang, text, vars),
    [lang]
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
