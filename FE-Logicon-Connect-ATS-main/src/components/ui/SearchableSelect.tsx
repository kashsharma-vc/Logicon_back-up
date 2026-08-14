import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  id?: string
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}

export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(() => {
    return options.find((o) => o.value === value)
  }, [options, value])

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    const term = searchTerm.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(term))
  }, [options, searchTerm])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearchTerm('')
    }
  }, [open])

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-widest text-app-subtle">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-left text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        <span className={cn('truncate', !selectedOption && 'text-app-subtle')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 text-app-subtle">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onChange('')
                }
              }}
              className="rounded p-0.5 hover:bg-app-muted hover:text-app-text"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
          {/* Search box */}
          <div className="sticky top-0 z-10 border-b border-app-border bg-app-surface p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-subtle" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-app-border bg-app-muted/30 py-1.5 pl-8 pr-3 text-xs text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto p-1 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-app-subtle">No roles found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors',
                      isSelected
                        ? 'bg-brand-500/10 font-semibold text-brand-600 dark:text-brand-400'
                        : 'text-app-text hover:bg-app-muted/60',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
