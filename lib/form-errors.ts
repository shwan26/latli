// After a failed Save, bring the first field with a problem into view and put
// the cursor in it. `order` lists the field ids from top to bottom.
export function focusFirstError(order: string[], errors: Record<string, string>) {
  const id = order.find((key) => errors[key])
  const element = id ? document.getElementById(id) : null

  if (!element) return

  element.scrollIntoView({ behavior: "smooth", block: "center" })
  element.focus({ preventScroll: true })
}
