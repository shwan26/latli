// Reads a customer chat screenshot on the device with Tesseract. Used when
// the profile cannot use Gemini.

export type OcrExtraction = {
  customerName: string
  productSize: string
  productColor: string
  customerMessage: string
}

const colorWords = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "pink",
  "purple",
  "brown",
  "gray",
  "grey",
  "beige",
  "cream",
  "navy",
  "orange",
]

const ignoredNameLines = [
  "intake",
  "active now",
  "reply",
  "suggested",
  "create order",
  "mark as lead",
  "hello",
  "min thuka",
]

const myanmarDigits: Record<string, string> = {
  "၀": "0",
  "၁": "1",
  "၂": "2",
  "၃": "3",
  "၄": "4",
  "၅": "5",
  "၆": "6",
  "၇": "7",
  "၈": "8",
  "၉": "9",
}

function normalizeDigits(value: string) {
  return value.replace(/[၀-၉]/g, (digit) => myanmarDigits[digit] ?? digit)
}

function normalizeOcrLine(value: string) {
  return normalizeDigits(value)
    .replace(/[|_*~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseCustomerName(text: string) {
  const lines = text
    .split(/\n+/)
    .map(normalizeOcrLine)
    .filter(Boolean)

  const nameLine = lines.find((line) => {
    const lower = line.toLowerCase()
    const hasLetters = /[a-z]/i.test(line)
    const hasMostlyNameChars = /^[a-z .'-]+$/i.test(line)
    const isIgnored = ignoredNameLines.some((word) => lower.includes(word))
    const isStatusLine = /\b\d{1,2}[:.]\d{2}\b|[0-9]{2,}|pm|am|lte|5g|4g/i.test(
      line
    )

    return hasLetters && hasMostlyNameChars && !isIgnored && !isStatusLine
  })

  return nameLine?.replace(/\s+\.+$/, "...") ?? ""
}

function parseSizeAndColor(text: string) {
  const normalized = normalizeDigits(text).replace(/\s+/g, " ")
  const colorSizeMatch = normalized.match(
    /\b(black|white|red|blue|green|yellow|pink|purple|brown|gr[ae]y|beige|cream|navy|orange)\s*[-:/]?\s*(\d{2}|xxxl|xxl|xl|xs|s|m|l)\b/i
  )

  if (colorSizeMatch) {
    return {
      productColor: toTitleCase(colorSizeMatch[1]),
      productSize: colorSizeMatch[2].toUpperCase(),
    }
  }

  const explicitSizeMatch = normalized.match(
    /(?:size|ဆိုဒ်)\s*[:.\-]?\s*(\d{2}|xxxl|xxl|xl|xs|s|m|l)|(\d{2}|xxxl|xxl|xl|xs|s|m|l)\s*[:.\-]?\s*(?:size|ဆိုဒ်)/i
  )
  const colorMatch = normalized.match(
    new RegExp(`\\b(${colorWords.join("|")})\\b`, "i")
  )
  const productSize = explicitSizeMatch
    ? (explicitSizeMatch[1] || explicitSizeMatch[2]).toUpperCase()
    : ""

  return {
    productColor: colorMatch ? toTitleCase(colorMatch[1]) : "",
    productSize,
  }
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function parseCustomerMessage(text: string) {
  return text
    .split(/\n+/)
    .map(normalizeOcrLine)
    .filter((line) => /[\u1000-\u109f]/.test(line))
    .slice(-3)
    .join("\n")
}

function getImageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error("Could not load screenshot."))
    image.src = dataUrl
  })
}

export async function readOrderWithOcr(
  file: File,
  dataUrl: string,
  onProgress: (message: string) => void
): Promise<OcrExtraction> {
  const { width, height } = await getImageSize(dataUrl)
  const { createWorker, PSM } = await import("tesseract.js")
  const workerOptions = {
    logger: (message: { status?: string; progress?: number }) => {
      if (message.status) {
        onProgress(
          `${message.status}${message.progress ? ` ${Math.round(message.progress * 100)}%` : ""}`
        )
      }
    },
  }
  let worker: Awaited<ReturnType<typeof createWorker>>

  try {
    worker = await createWorker("eng+mya", 1, workerOptions)
  } catch {
    worker = await createWorker("eng", 1, workerOptions)
  }

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    })

    onProgress("Reading customer name...")
    const nameResult = await worker.recognize(file, {
      rectangle: {
        left: Math.round(width * 0.12),
        top: Math.round(height * 0.04),
        width: Math.round(width * 0.76),
        height: Math.round(height * 0.22),
      },
    })

    onProgress("Reading order details...")
    const detailResult = await worker.recognize(file, {
      rectangle: {
        left: Math.round(width * 0.15),
        top: Math.round(height * 0.28),
        width: Math.round(width * 0.82),
        height: Math.round(height * 0.5),
      },
    })
    const fullResult = await worker.recognize(file)
    const fullText = fullResult.data.text
    const details = parseSizeAndColor(`${detailResult.data.text}\n${fullText}`)

    return {
      customerName: parseCustomerName(nameResult.data.text || fullText),
      productSize: details.productSize,
      productColor: details.productColor,
      customerMessage: parseCustomerMessage(fullText),
    }
  } finally {
    await worker.terminate()
  }
}
