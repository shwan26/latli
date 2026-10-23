import { supportMessenger } from "@/lib/support"

// A link that opens the Latli Messenger conversation for a Pro upgrade.
export function UpgradeLink({
  account,
}: {
  account?: { email?: string; plan?: string; role?: string }
}) {
  return (
    <a
      href={supportMessenger("upgrade", account)}
      className="font-medium text-foreground underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      Message us on Messenger
    </a>
  )
}
