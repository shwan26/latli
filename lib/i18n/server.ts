import { cookies } from "next/headers"

import { LANG_COOKIE, parseLang, translateTo, type Lang } from "./runtime"

// For server components: the visitor's language and a matching t().
export async function getI18n() {
  const lang: Lang = parseLang((await cookies()).get(LANG_COOKIE)?.value)

  return {
    lang,
    t: (text: string, vars?: Record<string, string | number>) =>
      translateTo(lang, text, vars),
  }
}
