import { translate } from "@/lib/i18n/runtime"

import { check, getDb } from "./shared"

const BUCKET = "photos"

// Matches the bucket's file_size_limit.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export type PhotoFolder = "orders" | "products"

// Uploads a JPEG/PNG/WebP data URL to <user id>/<folder>/<random>.<ext>
// and returns the storage path.
export async function uploadPhoto(dataUrl: string, folder: PhotoFolder) {
  const db = getDb()
  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) throw new Error(translate("You are signed out. Log in again"))

  const blob = await (await fetch(dataUrl)).blob()

  if (blob.size > MAX_PHOTO_BYTES) {
    throw new Error(translate("Photos can be at most 5 MB"))
  }

  // The database enforces this too; checking here gives a clear message.
  const { data: quota } = await db.rpc("photo_quota").maybeSingle<{
    used: number
    max: number
  }>()

  if (quota && quota.used >= quota.max) {
    throw new Error(
      translate(
        quota.max > 30
          ? "Photo limit reached ({max} photos). Delete old photos to upload more"
          : "Photo limit reached ({max} photos). Delete old photos or upgrade to Pro to upload more",
        { max: quota.max }
      )
    )
  }
  const extension =
    blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${extension}`

  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg" })

  check(error, "Could not upload the photo")

  return path
}

// Signed links for private photos, valid for an hour. Photos past their
// delete date are left out even if the clean-up job has not removed them yet.
export async function getPhotoUrls(paths: (string | undefined | null)[]) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))]
  const urls: Record<string, string> = {}

  if (unique.length === 0) return urls

  const expiry = await getPhotoExpiry(unique)
  const now = Date.now()
  const live = unique.filter(
    (path) => !expiry[path] || new Date(expiry[path]).getTime() > now
  )

  if (live.length === 0) return urls

  const { data, error } = await getDb()
    .storage.from(BUCKET)
    .createSignedUrls(live, 60 * 60)

  check(error, "Could not load photos")

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
  }

  return urls
}

// Best effort: a photo that cannot be removed is not worth failing a save.
export async function removePhotos(paths: (string | undefined | null)[]) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))]

  if (unique.length === 0) return

  await getDb().storage.from(BUCKET).remove(unique)
}

// When each photo will be deleted, as ISO dates. Photos without a record
// (for example already deleted) are left out.
export async function getPhotoExpiry(paths: (string | undefined | null)[]) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))]
  const expiry: Record<string, string> = {}

  if (unique.length === 0) return expiry

  const { data, error } = await getDb()
    .from("photo_expiry")
    .select("path, expires_at")
    .in("path", unique)

  check(error, "Could not load photo dates")

  for (const row of data ?? []) expiry[row.path] = row.expires_at

  return expiry
}

// Pro accounts only: keeps these photos for 30 days from now. Returns the new
// date. The database refuses the call for free accounts.
export async function keepPhotosLonger(paths: (string | undefined | null)[]) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))]

  const { data, error } = await getDb().rpc("keep_photos_longer", {
    photo_paths: unique,
  })

  check(error, "Could not keep the photos longer")

  return data as string
}
