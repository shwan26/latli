import Link from "next/link"

import { getI18n } from "@/lib/i18n/server"

// Bottom bar of the public pages: credit and links to the pages anyone can open.
export async function PublicFooter() {
  const { t } = await getI18n()

  return (
    <footer className="border-t border-[#ded6c9] bg-[#fbfaf7] px-5 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-[#605848] sm:flex-row sm:items-center sm:justify-between">
        <p>{t("Developed by Shwan")}</p>
        <nav
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
          aria-label={t("Legal")}
        >
          <Link href="/about" className="underline-offset-4 hover:underline">
            {t("About")}
          </Link>
          <Link href="/blog" className="underline-offset-4 hover:underline">
            {t("Blog")}
          </Link>
          <Link href="/contact" className="underline-offset-4 hover:underline">
            {t("Contact")}
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">
            {t("Terms of Service")}
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            {t("Privacy Policy")}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
