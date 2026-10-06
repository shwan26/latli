// Shown for any URL that matches no page. Server-rendered only: nothing here
// reads from the device or the signed-in account.

import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getI18n } from "@/lib/i18n/server"

export default async function NotFound() {
  const { t } = await getI18n()

  return (
    <main className="min-h-dvh bg-muted px-5 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm flex flex-col items-center">
        <Link href="/" aria-label={t("Latli")} className="mb-8 block w-fit">
          <Image
            src="/logo.png"
            alt=""
            width={644}
            height={434}
            priority
            className="h-16 w-auto"
          />
        </Link>

        <Card className="w-full rounded-[20px] shadow-none">
          <CardContent className="px-6 py-8 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-6xl font-semibold tracking-tight text-muted-foreground">404</p>
              <h1 className="text-xl font-medium">{t("Page not found")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("The page you are looking for does not exist or was moved")}
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full h-12 rounded-xl text-base">
                <Link href="/dashboard">{t("Go to dashboard")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full h-12 rounded-xl text-base"
              >
                <Link href="/">{t("Back to home")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
