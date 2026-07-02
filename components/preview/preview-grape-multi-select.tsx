'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type PreviewGrapeMultiSelectProps = {
  colors: PreviewColors
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

function toggleGrape(selected: string[], grape: string): string[] {
  return selected.includes(grape)
    ? selected.filter((item) => item !== grape)
    : [...selected, grape]
}

export function PreviewGrapeMultiSelect({
  colors,
  options,
  selected,
  onChange,
}: PreviewGrapeMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const triggerLabel =
    selected.length === 0
      ? 'Grapes'
      : selected.length === 1
        ? selected[0]
        : `Grapes (${selected.length})`

  const panelStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 50,
    minWidth: '100%',
    maxWidth: 280,
    maxHeight: 220,
    overflowY: 'auto',
    padding: '6px 0',
    borderRadius: 8,
    background: colors.searchBg,
    border: `1px solid ${colors.searchBorder}`,
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  }

  const optionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    fontSize: 11,
    color: colors.searchText,
    fontFamily: 'var(--font-dm-sans), sans-serif',
    cursor: 'pointer',
  }

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg flex-shrink-0"
        style={{
          background: selected.length > 0 ? colors.searchBg : colors.buttonBg,
          border: `1px solid ${selected.length > 0 ? '#C93048' : colors.buttonBorder}`,
          color: selected.length > 0 ? colors.searchText : colors.buttonText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          maxWidth: 180,
        }}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {open ? (
        <div role="listbox" aria-multiselectable style={panelStyle}>
          {options.length === 0 ? (
            <p
              className="m-0 px-3 py-1"
              style={{ fontSize: 11, color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              No grapes in list
            </p>
          ) : (
            options.map((grape) => {
              const checked = selected.includes(grape)
              return (
                <label
                  key={grape}
                  role="option"
                  aria-selected={checked}
                  style={{
                    ...optionStyle,
                    background: checked ? 'rgba(201, 48, 72, 0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    className="accent-[#C93048]"
                    onChange={() => onChange(toggleGrape(selected, grape))}
                  />
                  <span className="truncate">{grape}</span>
                </label>
              )
            })
          )}
          {selected.length > 0 ? (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 border-t mt-1"
              style={{
                fontSize: 11,
                color: colors.muted,
                fontFamily: 'var(--font-dm-sans), sans-serif',
                borderColor: colors.searchBorder,
                background: 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => onChange([])}
            >
              Clear grapes
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
