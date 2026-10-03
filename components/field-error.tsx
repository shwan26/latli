// A red star for required fields, and the red message shown under a field.

export function RequiredMark() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden="true">
      *
    </span>
  )
}

export function FieldError({
  id,
  message,
}: {
  id: string
  message?: string
}) {
  if (!message) return null

  return (
    <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}
