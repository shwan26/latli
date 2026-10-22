// Reads a customer chat screenshot with Gemini and returns the order fields.
// The API key stays on the server: set GEMINI_API_KEY in .env.local.
// Signed-in accounts can use it. Free accounts get 10 reads a month, Pro
// accounts are not limited; every read is counted (see the ai_usage migration).

import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

// Models are tried in this order. The next one is used when Google is busy.
// Set GEMINI_MODEL / GEMINI_FALLBACK_MODELS (comma separated) to change them.
const MODELS = [
  ...new Set([
    process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-2.5-flash-lite,gemini-3-flash")
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean),
  ]),
]
// Three tries have to fit in one request.
const ATTEMPT_TIMEOUT_MS = 20_000
const BUSY_STATUSES = [429, 500, 502, 503, 504]
export const maxDuration = 60
const MAX_IMAGE_CHARS = 8_000_000

const PROMPT = `You read a screenshot of a customer chat (usually Facebook Messenger, often in Burmese or English) from a shop that buys products for customers in Thailand.

Extract the order details. Rules:
- Only use what is visible in the screenshot. Never guess. Use "" for text and 0 for numbers when a value is not shown.
- customerName: the customer's display name, usually at the top of the chat.
- facebookName: the Facebook display name. Usually the same as customerName.
- phone: a phone number the customer wrote. Convert Burmese digits to 0-9.
- address: a delivery address or location the customer wrote.
- otherContacts: other contacts such as Viber, Telegram or a second phone.
- productName: a short name for the product, such as "dress" or "sneakers".
- productDescription: other product details the customer mentioned.
- productSize: the size or variant, such as "M", "42" or "XL".
- productColor: the colour.
- quantity: the number of items. Use 1 when it is not stated.
- sellingPriceThb: a price in Thai baht only if the chat states one.
- customerMessage: the customer's most relevant messages about the order, copied in their original language, at most 3 short lines.`

const STRING = { type: "STRING" }

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    customerName: STRING,
    facebookName: STRING,
    phone: STRING,
    address: STRING,
    otherContacts: STRING,
    productName: STRING,
    productDescription: STRING,
    productSize: STRING,
    productColor: STRING,
    quantity: { type: "INTEGER" },
    sellingPriceThb: { type: "NUMBER" },
    customerMessage: STRING,
  },
  required: [
    "customerName",
    "facebookName",
    "phone",
    "address",
    "otherContacts",
    "productName",
    "productDescription",
    "productSize",
    "productColor",
    "quantity",
    "sellingPriceThb",
    "customerMessage",
  ],
}

const TEXT_FIELDS = [
  "customerName",
  "facebookName",
  "phone",
  "address",
  "otherContacts",
  "productName",
  "productDescription",
  "productSize",
  "productColor",
  "customerMessage",
] as const

// One call to one model. Null when it times out or cannot be reached.
async function askGemini(
  model: string,
  mimeType: string,
  data: string,
  apiKey: string
) {
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0,
          },
        }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      }
    )
  } catch {
    return null
  }
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return fail("Supabase is not set up. See supabase/README.md", 503)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return fail("Log in to read screenshots with Gemini", 401)

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return fail(
      "Gemini is not set up. Add GEMINI_API_KEY to .env.local and restart the server",
      503
    )
  }

  let image = ""

  try {
    const body = await request.json()
    image = typeof body?.image === "string" ? body.image : ""
  } catch {
    return fail("The request was not valid", 400)
  }

  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([\w+/=]+)$/)

  if (!match || image.length > MAX_IMAGE_CHARS) {
    return fail("Upload a JPG, PNG or WebP image under about 6 MB", 400)
  }

  // Take one read. It is given back below if Gemini cannot answer.
  const { data: taken, error: quotaError } = await supabase
    .rpc("consume_ai_read")
    .single<{ allowed: boolean; used: number; max: number | null }>()

  if (quotaError || !taken) {
    return fail("Could not check your AI reads. Try again", 500)
  }

  if (!taken.allowed) {
    return Response.json(
      {
        error: "You have used all your free AI reads this month",
        quota: { used: taken.used, max: taken.max },
      },
      { status: 429 }
    )
  }

  async function failAndRefund(message: string, status: number) {
    await supabase.rpc("refund_ai_read")

    return fail(message, status)
  }

  // Ask each model in turn. Only a busy or silent model moves on to the next.
  let response: Response | null = null

  for (const model of MODELS) {
    response = await askGemini(model, match[1], match[2], apiKey)

    if (response && !BUSY_STATUSES.includes(response.status)) break

    console.error(
      "Gemini model unavailable",
      model,
      response ? response.status : "no answer"
    )
  }

  if (!response) {
    return failAndRefund("Gemini did not answer in time. Try again", 504)
  }

  if (!response.ok) {
    console.error("Gemini request failed", response.status, await response.text())

    return failAndRefund(
      response.status === 429
        ? "Gemini is busy or over its limit. Try again in a minute"
        : "Gemini could not read this image",
      502
    )
  }

  try {
    const result = await response.json()
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text
    const parsed = JSON.parse(typeof text === "string" ? text : "")

    const data: Record<string, string | number> = {}

    for (const field of TEXT_FIELDS) {
      data[field] = typeof parsed?.[field] === "string" ? parsed[field].trim() : ""
    }

    data.quantity = Number.isInteger(parsed?.quantity) && parsed.quantity > 0 ? parsed.quantity : 1
    data.sellingPriceThb =
      typeof parsed?.sellingPriceThb === "number" && parsed.sellingPriceThb > 0
        ? parsed.sellingPriceThb
        : 0

    return Response.json({
      data,
      quota: { used: taken.used, max: taken.max },
    })
  } catch {
    return failAndRefund("Gemini returned an answer that could not be read", 502)
  }
}
