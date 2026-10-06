// Permanently deletes the signed-in user's account and everything in it.
// Database rows go with the auth user (on delete cascade); photo files do not,
// so they are removed first.

import {
  adminClient,
  getSignedInUser,
  NOT_SET_UP,
  NOT_SIGNED_IN,
  removeAllPhotos,
} from "@/lib/account-admin"

export async function POST() {
  const user = await getSignedInUser()

  if (!user) return NOT_SIGNED_IN.clone()

  const db = adminClient()

  if (!db) return NOT_SET_UP.clone()

  try {
    await removeAllPhotos(db, user.id)

    const { error } = await db.auth.admin.deleteUser(user.id)

    if (error) throw new Error(error.message)
  } catch (error) {
    console.error("delete account failed", error)
    return Response.json({ error: "Could not delete your account" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
