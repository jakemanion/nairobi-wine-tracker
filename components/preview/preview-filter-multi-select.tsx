'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import type { PreviewColors } from '@/lib/preview/preview-colors'

const PANEL_MAX_HEIGHT = 260
const PANEL_WIDTH = 280
const PANEL_GAP = 4

export type FilterMultiSelectOption = {
  value: string
  label: string
}

export type FilterMultiSelectGroup = {
  label: string
  options: FilterMultiSelectOption[]
}

type PreviewFilterMultiSelectProps = {
  colors: PreviewColors
  label: string
  emptyMessage: string
  options?: string[]
  groups?: FilterMultiSelectGroup[]
  selected: string[]
  onChange: (selected: string[]) => void
  formatSelectedLabel?: (value: string) => string
}

function toggleOption(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value]
}

function placePanelBelowTrigger(rect: DOMRect) {
  let left = rect.left
  let top = rect.bottom + PANEL_GAP

  if (left + PANEL_WIDTH > window.innerWidth - 12) {
    left = window.innerWidth - PANEL_WIDTH - 12
  }
  if (left < 12) left = 12

  if (top + PANEL_MAX_HEIGHT > window.innerHeight - 12) {
    top = rect.top - PANEL_MAX_HEIGHT - PANEL_GAP
  }
  if (top < 12) top = 12

  return { left, top }
}

function flatOptions(
  options: string[] | undefined,
  groups: FilterMultiSelectGroup[] | undefined,
): FilterMultiSelectOption[] {
  if (groups?.length) {
    return groups.flatMap((group) => group.options)
  }
  return (options ?? []).map((option) => ({ value: option, label: option }))
}

export function PreviewFilterMultiSelect({
  colors,
  label,
  emptyMessage,
  options,
  groups,
  selected,
  onChange,
  formatSelectedLabel,
}: PreviewFilterMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const allOptions = flatOptions(options, groups)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }

    function updatePosition() {
      if (!triggerRef.current) return
      setPanelPosition(placePanelBelowTrigger(triggerRef.current.getBoundingClientRect()))
    }

    updatePosition()
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  const triggerLabel =
    selected.length === 0 ? label : `${label} (${selected.length})`

  const panelStyle: CSSProperties = {
    position: 'fixed',
    left: panelPosition.left,
    top: panelPosition.top,
    zIndex: 10000,
    width: PANEL_WIDTH,
    maxHeight: PANEL_MAX_HEIGHT,
    overflowY: 'auto',
    padding: '6px 0',
    borderRadius: 8,
    background: colors.searchBg,
    border: `1px solid ${colors.searchBorder}`,
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
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

  const groupHeadingStyle: CSSProperties = {
    padding: '8px 10px 4px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: colors.muted,
    fontFamily: 'var(--font-dm-sans), sans-serif',
  }

  function toggleOpen() {
    if (!open && triggerRef.current) {
      setPanelPosition(placePanelBelowTrigger(triggerRef.current.getBoundingClientRect()))
    }
    setOpen((current) => !current)
  }

  function renderOption(option: FilterMultiSelectOption) {
    const checked = selected.includes(option.value)
    return (
      <label
        key={option.value}
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
          onChange={() => onChange(toggleOption(selected, option.value))}
        />
        <span className="truncate">{option.label}</span>
      </label>
    )
  }

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 flex-shrink-0"

        style={{
          fontSize: 12,
          lineHeight: 1.2,
          padding: '8px 12px',
          borderRadius: 8,
          background: selected.length > 0 ? colors.searchBg : colors.buttonBg,
          border: `1px solid ${selected.length > 0 ? '#C93048' : colors.buttonBorder}`,
          color: selected.length > 0 ? colors.searchText : colors.buttonText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          maxWidth: 200,
        }}
        onClick={toggleOpen}
      >
        <span className="truncate">{triggerLabel}</span>
        {selected.length > 0 ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${label}`}
            className="inline-flex items-center justify-center rounded-sm flex-shrink-0 hover:opacity-80"
            style={{ color: colors.muted }}
            onClick={(event) => {
              event.stopPropagation()
              onChange([])
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                onChange([])
              }
            }}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {mounted && open
        ? createPortal(
            <div ref={panelRef} role="listbox" aria-multiselectable style={panelStyle}>
              {allOptions.length === 0 ? (
                <p
                  className="m-0 px-3 py-1"
                  style={{
                    fontSize: 11,
                    color: colors.muted,
                    fontFamily: 'var(--font-dm-sans), sans-serif',
                  }}
                >
                  {emptyMessage}
                </p>
              ) : groups?.length ? (
                groups.map((group) => (
                  <div key={group.label}>
                    <div style={groupHeadingStyle}>{group.label}</div>
                    {group.options.map((option) => renderOption(option))}
                  </div>
                ))
              ) : (
                allOptions.map((option) => renderOption(option))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
