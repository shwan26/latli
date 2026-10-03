import { Fragment, type ReactNode } from "react"

// Puts elements such as links inside a translated sentence. The sentence marks
// where each one goes, so every language can place it where it reads best:
//   <RichText text={t("Contact {email} to upgrade.")} parts={{ email: <a/> }} />
export function RichText({
  text,
  parts,
}: {
  text: string
  parts: Record<string, ReactNode>
}) {
  return (
    <>
      {text.split(/(\{\w+\})/g).map((chunk, index) => {
        const name = chunk.match(/^\{(\w+)\}$/)?.[1]

        return name && name in parts ? (
          <Fragment key={index}>{parts[name]}</Fragment>
        ) : (
          chunk
        )
      })}
    </>
  )
}
