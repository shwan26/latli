import Image from "next/image"
import Link from "next/link"

import { LanguageSelect } from "@/components/language-select"
import { Button } from "@/components/ui/button"
import { getI18n } from "@/lib/i18n/server"

// Top bar of the public pages: Pricing, language drop-down, then Login.
export async function PublicNavbar() {
  const { t } = await getI18n()

  return (
    <header className="border-b border-[#ded6c9] bg-[#fbfaf7]/90 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt={t("Latli")}
            width={644}
            height={434}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="whitespace-nowrap text-xs font-medium underline-offset-4 hover:underline sm:text-sm"
          >
            {t("Pricing")}
          </Link>
          <LanguageSelect compact />
          <Button asChild className="h-9 rounded-lg px-4 tracking-normal sm:h-10 sm:px-5">
            <Link href="/login">{t("Login")}</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
