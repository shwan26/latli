import { MESSENGER_URL } from "@/lib/site"

type Account = {
  email?: string
  plan?: string
  role?: string
}

export function supportMessenger(kind: "upgrade" | "ticket", account?: Account) {
  const baseUrl = MESSENGER_URL || "https://m.me/syovstudio"
  const message =
    kind === "upgrade"
      ? `Hello, I would like to upgrade to Latli Pro.${account?.email ? ` My account email is ${account.email}.` : ""}`
      : `Hello, I need help with Latli.${account?.email ? ` My account email is ${account.email}.` : ""}`

  return `${baseUrl}?text=${encodeURIComponent(message)}`
}
