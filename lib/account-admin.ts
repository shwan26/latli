// Server-only helpers for the account routes. They use the service role key,
// so never import this from a client component.

import { createClient as createAdminClient } from "@supabase/supabase-js"

import { supabaseUrl } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

const BUCKET = "photos"
const FOLDERS = ["orders", "products"]
const PAGE = 100

export async function getSignedInUser() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()

  return user
}

export function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  return createAdminClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}

export type AdminClient = NonNullable<ReturnType<typeof adminClient>>

// Deletes every file in <user id>/orders and <user id>/products.
export async function removeAllPhotos(db: AdminClient, userId: string) {
  for (const folder of FOLDERS) {
    const prefix = `${userId}/${folder}`

    // Files shift up after each removal, so always list from the start.
    for (;;) {
      const { data, error } = await db.storage
        .from(BUCKET)
        .list(prefix, { limit: PAGE })

      if (error) throw new Error(error.message)

      const files = (data ?? []).filter((file) => file.id)

      if (files.length === 0) break

      const { error: removeError } = await db.storage
        .from(BUCKET)
        .remove(files.map((file) => `${prefix}/${file.name}`))

      if (removeError) throw new Error(removeError.message)

      if (files.length < PAGE) break
    }
  }
}

export const NOT_SIGNED_IN = Response.json(
  { error: "You are signed out. Log in again" },
  { status: 401 }
)

export const NOT_SET_UP = Response.json(
  { error: "Supabase service key is not set up." },
  { status: 503 }
)
