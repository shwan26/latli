import { LEGAL } from "@/app/lib/legal"

type Account = {
  email?: string
  plan?: string
  role?: string
}

function accountLines(account?: Account) {
  if (!account?.email) return []

  return [
    "",
    "--- Account (please keep this) ---",
    `Email: ${account.email}`,
    ...(account.plan ? [`Plan: ${account.plan}`] : []),
    ...(account.role ? [`Role: ${account.role}`] : []),
  ]
}

// A link that opens the user's email app with a message to support already
// written. It is how people ask for Pro and raise a ticket.
export function supportMailto(kind: "upgrade" | "ticket", account?: Account) {
  const subject = kind === "upgrade" ? "Upgrade to Pro" : "Support ticket"

  const lines =
    kind === "upgrade"
      ? ["Hello, I would like to upgrade to the Pro plan.", ...accountLines(account)]
      : [
          "What happened:",
          "",
          "What you expected:",
          "",
          "Steps to see it:",
          ...accountLines(account),
        ]

  const body = lines.join("\r\n")

  return `mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
