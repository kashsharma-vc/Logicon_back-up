import { CircleAlert, X } from 'lucide-react'

/**
 * Inline workflow action error (e.g. onboarding finalization preflight).
 * Visual pattern: pale red panel, strong left accent, icon + dismiss — similar to a toast-style alert.
 */
export function WorkflowActionErrorBanner({
  message,
  bullets = [],
  onDismiss,
}: {
  message: string
  bullets?: string[]
  onDismiss: () => void
}) {
  return (
    <div
      role="alert"
      className="relative flex gap-3 rounded-sm border-y border-r border-red-200/90 border-l-4 border-l-red-600 bg-red-50 py-3 pl-3 pr-10 text-red-800 shadow-sm"
    >
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
      <div className="min-w-0 flex-1 pr-1">
        <p className="text-sm font-medium leading-snug text-red-800">{message}</p>
        {bullets.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-snug text-red-800 marker:text-red-600">
            {bullets.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded p-1 text-red-600 transition-colors hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        aria-label="Dismiss error"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
