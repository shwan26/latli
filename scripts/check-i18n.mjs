// Lists English text that is passed to t() / translate() but has no Burmese
// entry in lib/i18n/my.ts, and Burmese entries nothing uses any more.
//   node scripts/check-i18n.mjs          report only
//   node scripts/check-i18n.mjs --list   print every key that is in use

import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const ROOTS = ["app", "components", "lib"]
// The Terms and Privacy pages are not translated yet.
const LEGAL_FILES = ["app/terms/page.tsx", "app/privacy/page.tsx"]
const used = new Set()

// Text that is translated at its use site by name, not through a literal.
const EXTRA = [
  // order / payment status labels (app/lib/local-orders.ts)
  "Not bought", "Bought", "Sent to cargo", "Delivered", "Returned", "Complete",
  "Not paid", "Partially / deposit paid", "Fully paid", "Refunded",
  // messages from the server routes and the database
  "Supabase is not set up. See supabase/README.md",
  "Log in to read screenshots with Gemini",
  "Gemini is available to managers on the Pro plan",
  "Gemini is not set up. Add GEMINI_API_KEY to .env.local and restart the server",
  "The request was not valid",
  "Upload a JPG, PNG or WebP image under about 6 MB",
  "Gemini did not answer in time. Try again",
  "Gemini is busy or over its limit. Try again in a minute",
  "Gemini could not read this image",
  "Gemini returned an answer that could not be read",
  "Log in to keep photos longer",
  "Keeping photos longer is available on the Pro plan",
  // sign-in messages from Supabase Auth
  "Invalid login credentials",
  "Email not confirmed",
  "User already registered",
  "Password should be at least 8 characters",
  "Email rate limit exceeded",
  "Unable to validate email address: invalid format",
  "Signup requires a valid password",
]
for (const text of EXTRA) used.add(text)

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(tsx?|mjs)$/.test(entry.name) && !full.includes("components/ui/") && !full.includes("lib/i18n/my") && !LEGAL_FILES.some((f) => full.endsWith(f))) out.push(full)
  }
  return out
}

function collect(node, sf) {
  // Every string literal the first argument can turn into.
  const take = (n) => {
    if (!n) return
    if (ts.isParenthesizedExpression(n)) return take(n.expression)
    if (ts.isConditionalExpression(n)) { take(n.whenTrue); take(n.whenFalse); return }
    if (ts.isBinaryExpression(n)) { take(n.left); take(n.right); return }
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) used.add(n.text)
  }
  take(node)
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression
        const name = ts.isIdentifier(callee) ? callee.text : ""

        if ((name === "t" || name === "translate") && node.arguments[0]) collect(node.arguments[0], sf)
        // check(error, "action") and fetchAllRows("action", ...)
        if (name === "check" && node.arguments[1]) collect(node.arguments[1], sf)
        if (name === "fetchAllRows" && node.arguments[0]) collect(node.arguments[0], sf)
        // fail("message", status) in the API routes
        if (name === "fail" && node.arguments[0]) collect(node.arguments[0], sf)
      }
      ts.forEachChild(node, visit)
    }

    visit(sf)
  }
}

const known = new Set(Object.keys(JSON.parse(fs.readFileSync("lib/i18n/my.json", "utf8"))))

if (process.argv.includes("--list")) {
  console.log([...used].sort().join("\n"))
  process.exit(0)
}

const missing = [...used].filter((text) => !known.has(text)).sort()
const unused = [...known].filter((text) => !used.has(text)).sort()

console.log(`${used.size} phrases in use, ${known.size} translated.`)
if (missing.length) {
  console.log(`\nMissing Burmese (${missing.length}):`)
  for (const text of missing) console.log("  " + JSON.stringify(text))
}
if (unused.length) {
  console.log(`\nTranslated but not used (${unused.length}):`)
  for (const text of unused) console.log("  " + JSON.stringify(text))
}
process.exit(missing.length ? 1 : 0)
