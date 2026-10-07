// Deletes all of the signed-in user's data (orders, customers, shops, cargo and
// photos). The account and profile stay.

import {
  adminClient,
  guardDangerousRequest,
  NOT_SET_UP,
  removeAllPhotos,
} from "@/lib/account-admin"

const TABLES = ["orders", "shops", "customers", "cargo_companies", "photo_expiry"]

export async function POST(request: Request) {
  const guard = await guardDangerousRequest(request)

  if ("response" in guard) return guard.response

  const { user } = guard

  const db = adminClient()

  if (!db) return NOT_SET_UP.clone()

  try {
    await removeAllPhotos(db, user.id)

    // Shop products go with their shop.
    for (const table of TABLES) {
      const { error } = await db.from(table).delete().eq("user_id", user.id)

      if (error) throw new Error(error.message)
    }
  } catch (error) {
    console.error("clear account data failed", error)
    return Response.json({ error: "Could not clear your data" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
