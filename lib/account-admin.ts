// Server-only helpers for the account routes. They use the service role key,
// so never import this from a client component.

import { createClient as createAdminClient, type User } from "@supabase/supabase-js"

import { CONFIRM_WORD } from "@/lib/account-confirm"
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env"
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

// Checks the password with a throwaway client that keeps no session, so the
// browser's cookies are untouched. The email comes from the verified session,
// never from the request.
async function passwordIsRight(email: string, password: string) {
  if (!supabaseUrl || !supabaseKey) return false

  const { error } = await createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.signInWithPassword({ email, password })

  return !error
}

// These routes act on the login cookie alone, so they must not run just
// because a request arrived with the cookie. Everything is checked here, on
// the server:
//  - Origin must be this site, so a page on another site cannot trigger them.
//    The JSON body also forces a CORS preflight for other sites.
//  - The typed word, and
//  - the account password, checked with Supabase.
// Returns the signed-in user, or an error response to send back.
export async function guardDangerousRequest(
  request: Request
): Promise<{ user: User } | { response: Response }> {
  const origin = request.headers.get("origin")
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")

  let originHost: string | null = null

  try {
    originHost = origin ? new URL(origin).host : null
  } catch {}

  if (!originHost || !host || originHost !== host) {
    return {
      response: Response.json({ error: "Request not allowed" }, { status: 403 }),
    }
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {
      response: Response.json({ error: "Request not allowed" }, { status: 415 }),
    }
  }

  const body = (await request.json().catch(() => null)) as {
    confirm?: unknown
    password?: unknown
  } | null

  if (body?.confirm !== CONFIRM_WORD) {
    return {
      response: Response.json(
        { error: `Type ${CONFIRM_WORD} to confirm` },
        { status: 400 }
      ),
    }
  }

  const user = await getSignedInUser()

  if (!user?.email) return { response: NOT_SIGNED_IN.clone() }

  if (
    typeof body.password !== "string" ||
    !body.password ||
    !(await passwordIsRight(user.email, body.password))
  ) {
    return {
      response: Response.json({ error: "Wrong password" }, { status: 403 }),
    }
  }

  return { user }
}

export const NOT_SIGNED_IN = Response.json(
  { error: "You are signed out. Log in again" },
  { status: 401 }
)

export const NOT_SET_UP = Response.json(
  { error: "Supabase service key is not set up." },
  { status: 503 }
)
