// Reads a customer chat screenshot with Gemini and returns the order fields.
// The API key stays on the server: set GEMINI_API_KEY in .env.local.
// Only signed-in managers on the Pro plan can use it.

import { canUseGemini, fetchProfile } from "@/lib/profile"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"
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

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return fail("Supabase is not set up. See supabase/README.md.", 503)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return fail("Log in to read screenshots with Gemini.", 401)

  const profile = await fetchProfile(supabase)

  if (!profile || !canUseGemini(profile)) {
    return fail("Gemini is available to managers on the Pro plan.", 403)
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return fail(
      "Gemini is not set up. Add GEMINI_API_KEY to .env.local and restart the server.",
      503
    )
  }

  let image = ""

  try {
    const body = await request.json()
    image = typeof body?.image === "string" ? body.image : ""
  } catch {
    return fail("The request was not valid.", 400)
  }

  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([\w+/=]+)$/)

  if (!match || image.length > MAX_IMAGE_CHARS) {
    return fail("Upload a JPG, PNG or WebP image under about 6 MB.", 400)
  }

  let response: Response

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
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
                { inline_data: { mime_type: match[1], data: match[2] } },
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
        signal: AbortSignal.timeout(45_000),
      }
    )
  } catch {
    return fail("Gemini did not answer in time. Try again.", 504)
  }

  if (!response.ok) {
    console.error("Gemini request failed", response.status, await response.text())

    return fail(
      response.status === 429
        ? "Gemini is busy or over its limit. Try again in a minute."
        : "Gemini could not read this image.",
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

    return Response.json({ data })
  } catch {
    return fail("Gemini returned an answer that could not be read.", 502)
  }
}
