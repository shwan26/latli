import { IconBrandMessenger } from "@tabler/icons-react"

import { MESSENGER_URL } from "@/lib/site"
import { getI18n } from "@/lib/i18n/server"

// A round button on the public pages that opens a Messenger chat with our
// Facebook Page. Meta no longer offers a chat box to embed, so this is a link.
export async function MessengerButton() {
  if (!MESSENGER_URL) return null

  const { t } = await getI18n()

  return (
    <a
      href={MESSENGER_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("Chat with us on Messenger")}
      title={t("Chat with us on Messenger")}
      className="fixed bottom-5 right-5 z-30 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00b2ff] to-[#006aff] text-white shadow-lg transition active:scale-95 print:hidden"
    >
      <IconBrandMessenger className="size-7" />
    </a>
  )
}
