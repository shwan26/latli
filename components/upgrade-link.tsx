import { LEGAL } from "@/app/lib/legal"
import { supportMailto } from "@/lib/support"

// The support address as a link that starts an "Upgrade to Pro" email.
export function UpgradeLink({
  account,
}: {
  account?: { email?: string; plan?: string; role?: string }
}) {
  return (
    <a
      href={supportMailto("upgrade", account)}
      className="font-medium text-foreground underline"
    >
      {LEGAL.contactEmail}
    </a>
  )
}
