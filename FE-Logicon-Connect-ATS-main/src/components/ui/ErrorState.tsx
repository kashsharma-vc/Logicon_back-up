import { AlertCircle } from 'lucide-react'

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex gap-3 rounded-panel border border-status-danger/30 bg-status-danger/5 px-4 py-3 text-sm text-status-danger"
      role="alert"
    >
      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
      <p className="whitespace-pre-wrap">{message}</p>
    </div>
  )
}




