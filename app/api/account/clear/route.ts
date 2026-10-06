// Deletes all of the signed-in user's data (orders, customers, shops, cargo and
// photos). The account and profile stay.

import {
  adminClient,
  getSignedInUser,
  NOT_SET_UP,
  NOT_SIGNED_IN,
  removeAllPhotos,
} from "@/lib/account-admin"

const TABLES = ["orders", "shops", "customers", "cargo_companies", "photo_expiry"]

export async function POST() {
  const user = await getSignedInUser()

  if (!user) return NOT_SIGNED_IN.clone()

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
    return Response.json({ error: "Could not clear your data." }, { status: 500 })
  }

  return Response.json({ ok: true })
}
