// Deletes photos whose retention date has passed, and photos that were
// uploaded but never saved on an order or product. Run it on a schedule (see
// supabase/README.md). It needs the service role key, so it must stay on the
// server, and the caller must send "Authorization: Bearer <CRON_SECRET>".

import { createClient } from "@supabase/supabase-js"
import { timingSafeEqual } from "node:crypto"

import { supabaseUrl } from "@/lib/supabase/env"

const BUCKET = "photos"
const BATCH = 200
const MAX_BATCHES = 20

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get("authorization") ?? ""

  if (!secret) return false

  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(given)

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

async function expirePhotos(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Not allowed." }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return Response.json(
      { error: "Supabase service key is not set up." },
      { status: 503 }
    )
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  let deleted = 0
  let orphans = 0

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const { data, error } = await db.rpc("expired_photo_paths", {
      max_rows: BATCH,
    })

    if (error) {
      console.error("expired_photo_paths failed", error.message)
      return Response.json({ error: "Could not list expired photos.", deleted }, { status: 500 })
    }

    const paths = (data ?? []) as string[]

    if (paths.length === 0) break

    // Remove the files first. Only forget the paths once that worked.
    const { error: removeError } = await db.storage.from(BUCKET).remove(paths)

    if (removeError) {
      console.error("storage remove failed", removeError.message)
      return Response.json({ error: "Could not delete photos.", deleted }, { status: 500 })
    }

    const { error: clearError } = await db.rpc("clear_expired_photos", {
      photo_paths: paths,
    })

    if (clearError) {
      console.error("clear_expired_photos failed", clearError.message)
      return Response.json({ error: "Could not update records.", deleted }, { status: 500 })
    }

    deleted += paths.length

    if (paths.length < BATCH) break
  }

  // Files that never got an expiry date (see the photo_limits migration).
  // Deleting them lists them no more, so each batch starts fresh.
  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const { data, error } = await db.rpc("orphan_photo_paths", {
      max_rows: BATCH,
    })

    if (error) {
      console.error("orphan_photo_paths failed", error.message)
      return Response.json({ error: "Could not list orphan photos.", deleted, orphans }, { status: 500 })
    }

    const paths = (data ?? []) as string[]

    if (paths.length === 0) break

    const { error: removeError } = await db.storage.from(BUCKET).remove(paths)

    if (removeError) {
      console.error("storage remove failed", removeError.message)
      return Response.json({ error: "Could not delete orphan photos.", deleted, orphans }, { status: 500 })
    }

    orphans += paths.length

    if (paths.length < BATCH) break
  }

  return Response.json({ deleted, orphans })
}

// Vercel Cron sends GET. Supabase pg_net can send either.
export const GET = expirePhotos
export const POST = expirePhotos
