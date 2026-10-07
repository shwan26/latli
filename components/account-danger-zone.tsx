"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconTrash, IconUserX } from "@tabler/icons-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CONFIRM_WORD } from "@/lib/account-confirm"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/provider"

type Action = "clear" | "delete"

// Clear-all-data and delete-account buttons for the More page. Both call a
// server route, because they need the service role key.
export function AccountDangerZone() {
  const { t } = useI18n()
  const router = useRouter()

  const [action, setAction] = useState<Action | null>(null)
  const [typed, setTyped] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  function open(next: Action) {
    setAction(next)
    setTyped("")
    setPassword("")
    setError("")
    setNotice("")
  }

  function close() {
    if (!busy) setAction(null)
  }

  async function run() {
    if (!action) return

    setBusy(true)
    setError("")

    try {
      const response = await fetch(`/api/account/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: typed.trim(), password }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        throw new Error(
          t(body?.error ?? "Something went wrong. Please try again")
        )
      }
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : t("Something went wrong. Please try again")
      )
      setBusy(false)
      return
    }

    setBusy(false)
    setPassword("")
    setAction(null)

    if (action === "delete") {
      await createClient().auth.signOut()
      router.push("/login")
    } else {
      setNotice(t("All your data was cleared"))
    }

    router.refresh()
  }

  const deleting = action === "delete"

  return (
    <>
      {notice ? (
        <Alert className="rounded-xl">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl text-destructive hover:text-destructive"
        onClick={() => open("clear")}
      >
        <IconTrash className="mr-2 size-5" />
        {t("Clear all data")}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl text-destructive hover:text-destructive"
        onClick={() => open("delete")}
      >
        <IconUserX className="mr-2 size-5" />
        {t("Delete account")}
      </Button>

      <Dialog open={action !== null} onOpenChange={(value) => !value && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleting ? t("Delete your account?") : t("Clear all data?")}
            </DialogTitle>
            <DialogDescription>
              {deleting
                ? t("This permanently deletes your account, orders, customers, shops, cargo companies and photos. It cannot be undone")
                : t("This permanently deletes all your orders, customers, shops, cargo companies and photos. Your account and settings stay. It cannot be undone")}
            </DialogDescription>
          </DialogHeader>

          {action ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("Type {word} to confirm", { word: CONFIRM_WORD })}
              </p>
              <Input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                aria-label={t("Type {word} to confirm", { word: CONFIRM_WORD })}
                autoComplete="off"
                className="h-12 rounded-xl"
              />
              <p className="pt-1 text-sm text-muted-foreground">
                {t("Enter your password to confirm")}
              </p>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-label={t("Password")}
                autoComplete="current-password"
                className="h-12 rounded-xl"
              />
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={close}>
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || typed.trim() !== CONFIRM_WORD || !password}
              onClick={run}
            >
              {busy
                ? t("Please wait...")
                : deleting
                  ? t("Delete account")
                  : t("Clear all data")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
