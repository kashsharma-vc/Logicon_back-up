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
  disabled?: boolean
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
  disabled,
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
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean)
    return options.filter((o) => {
      if (!o.value) return false // Hide "Any role" placeholder when actively searching
      const labelLower = o.label.toLowerCase()
      return terms.every((t) => labelLower.includes(t))
    })
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

  const totalCount = options.filter((o) => o.value).length

  return (
    <div className={cn('relative flex flex-col gap-1 w-full', className)} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-app-secondary">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-left text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:pointer-events-none disabled:opacity-50"
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
        <div className="absolute z-50 mt-1 max-h-[420px] w-full min-w-[280px] overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
          {/* Search box & counter header */}
          <div className="sticky top-0 z-10 border-b border-app-border bg-app-surface p-2.5 space-y-1.5">
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
            <div className="flex items-center justify-between px-1 text-[11px] text-app-subtle">
              <span>{searchTerm.trim() ? `Found ${filteredOptions.length} matching` : `All ${totalCount} available roles`}</span>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Reset filter
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-72 overflow-y-auto p-1.5 text-xs divide-y divide-app-border/30">
            {filteredOptions.length === 0 ? (
              <div className="py-5 text-center text-app-subtle space-y-2">
                <p className="font-medium">No matching roles found</p>
                {options.some((o) => o.value === 'other') ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('other')
                      setOpen(false)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-500/25 dark:text-brand-300"
                  >
                    ➕ Select Other (Type manually)
                  </button>
                ) : (
                  <p className="text-[11px]">Try searching with a different keyword</p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'bg-brand-500/15 font-semibold text-brand-700 dark:text-brand-300'
                        : 'text-app-text hover:bg-app-muted/70',
                    )}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />}
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
