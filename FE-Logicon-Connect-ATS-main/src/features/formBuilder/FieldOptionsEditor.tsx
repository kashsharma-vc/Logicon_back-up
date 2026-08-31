import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function FieldOptionsEditor({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  error?: string | null
}) {
  function setAt(idx: number, next: string) {
    const out = value.slice()
    out[idx] = next
    onChange(out)
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= value.length) return
    const out = value.slice()
    const tmp = out[idx]!
    out[idx] = out[target]!
    out[target] = tmp
    onChange(out)
  }

  function add() {
    onChange([...value, ''])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-app-secondary">Options</p>
        <Button type="button" variant="secondary" className="min-h-9 px-2" onClick={add} disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Add option
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-panel border border-dashed border-app-border bg-app-muted px-3 py-2 text-xs text-app-subtle">
          No options yet. Add at least one option for select / multi-select fields.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((opt, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-xs text-app-subtle">{idx + 1}.</span>
              <input
                value={opt}
                onChange={(e) => setAt(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                disabled={disabled}
                className="min-h-10 flex-1 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2"
                onClick={() => move(idx, -1)}
                disabled={disabled || idx === 0}
                aria-label="Move up"
                title="Move up"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2"
                onClick={() => move(idx, 1)}
                disabled={disabled || idx === value.length - 1}
                aria-label="Move down"
                title="Move down"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="danger"
                className="min-h-9 px-2"
                onClick={() => removeAt(idx)}
                disabled={disabled}
                aria-label="Remove option"
                title="Remove option"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-status-danger">{error}</p> : null}
    </div>
  )
}
