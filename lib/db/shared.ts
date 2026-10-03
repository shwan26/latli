import { translate } from "@/lib/i18n/runtime"
import { createClient } from "@/lib/supabase/client"

export function getDb() {
  return createClient()
}

type DbError = { message: string } | null | undefined

// Turns a Supabase error into a thrown Error with a readable message.
export function check(error: DbError, action: string) {
  if (error) throw new Error(`${translate(action)}: ${translate(error.message)}`)
}

const PAGE_SIZE = 1000

// Supabase returns at most 1000 rows per request, so read in pages.
export async function fetchAllRows<T>(
  action: string,
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: DbError }>
) {
  const rows: T[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)

    check(error, action)

    rows.push(...(data ?? []))

    if (!data || data.length < PAGE_SIZE) return rows
  }
}

export function messageOf(error: unknown, fallback = "Something went wrong.") {
  return error instanceof Error && error.message
    ? error.message
    : translate(fallback)
}
