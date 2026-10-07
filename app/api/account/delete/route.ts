// Permanently deletes the signed-in user's account and everything in it.
// Database rows go with the auth user (on delete cascade); photo files do not,
// so they are removed first.

import {
  adminClient,
  guardDangerousRequest,
  NOT_SET_UP,
  removeAllPhotos,
} from "@/lib/account-admin"

export async function POST(request: Request) {
  const guard = await guardDangerousRequest(request)

  if ("response" in guard) return guard.response

  const { user } = guard

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
