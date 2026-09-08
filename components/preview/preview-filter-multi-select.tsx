'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, X } from 'lucide-react'
import type { PreviewColors } from '@/lib/preview/preview-colors'

const PANEL_MAX_HEIGHT = 220
const PANEL_WIDTH = 240
const PANEL_GAP = 4
const TRIGGER_HEIGHT = 22
const TRIGGER_FONT_SIZE = 10

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
  /** When set, shows an All option that selects/deselects every item. */
  selectAllLabel?: string
  /** Trigger label when every option is selected. Defaults to `${label}: ${selectAllLabel}`. */
  allSelectedLabel?: string
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
  selectAllLabel,
  allSelectedLabel,
}: PreviewFilterMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const allOptions = flatOptions(options, groups)
  const allValues = allOptions.map((option) => option.value)
  const allSelected =
    allValues.length > 0 && allValues.every((value) => selected.includes(value))
  const hasSelection = selected.length > 0
  const isPartialSelection = selectAllLabel ? hasSelection && !allSelected : hasSelection
  const isActive = hasSelection
  const triggerLabel = selectAllLabel
    ? allSelected
      ? allSelectedLabel ?? `${label}: ${selectAllLabel}`
      : isPartialSelection
        ? `${label} (${selected.length})`
        : `${label}...`
    : hasSelection
      ? `${label} (${selected.length})`
      : label

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

  const panelStyle: CSSProperties = {
    position: 'fixed',
    left: panelPosition.left,
    top: panelPosition.top,
    zIndex: 10000,
    width: PANEL_WIDTH,
    maxHeight: PANEL_MAX_HEIGHT,
    overflowY: 'auto',
    padding: '6px 0',
    borderRadius: colors.panelRadius,
    background: colors.searchBg,
    border: `1px solid ${colors.searchBorder}`,
    boxShadow: colors.cardShadow,
  }

  const optionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    fontSize: 10,
    color: colors.summaryStrong,
    fontFamily: 'var(--font-dm-sans), sans-serif',
    cursor: 'pointer',
  }

  const groupHeadingStyle: CSSProperties = {
    padding: '6px 8px 2px',
    fontSize: 9,
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

  function clearSelection() {
    onChange(selectAllLabel ? allValues : [])
  }

  function toggleSelectAll() {
    onChange(allSelected ? [] : allValues)
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
          background: checked ? `${colors.accent}14` : 'transparent',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          className="accent-current"
          style={{ accentColor: colors.accent }}
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
          height: TRIGGER_HEIGHT,
          fontSize: TRIGGER_FONT_SIZE,
          lineHeight: 1.2,
          padding: '0 8px',
          borderRadius: colors.panelRadius,
          background: isActive ? colors.searchBg : colors.buttonBg,
          border: `1px solid ${isActive ? colors.accent : colors.buttonBorder}`,
          color: isActive ? colors.summaryStrong : colors.buttonText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          maxWidth: 160,
        }}
        onClick={toggleOpen}
      >
        {isActive ? (
          <Check size={10} strokeWidth={2.5} style={{ color: colors.accent }} aria-hidden className="flex-shrink-0" />
        ) : null}
        <span className="truncate">{triggerLabel}</span>
        {isPartialSelection ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${label}`}
            className="inline-flex items-center justify-center rounded-sm flex-shrink-0 hover:opacity-80"
            style={{ color: colors.muted }}
            onClick={(event) => {
              event.stopPropagation()
              clearSelection()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                clearSelection()
              }
            }}
          >
            <X className="w-3 h-3" />
          </span>
        ) : null}
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {mounted && open
        ? createPortal(
            <div ref={panelRef} role="listbox" aria-multiselectable style={panelStyle}>
              {allOptions.length === 0 ? (
                <p
                  className="m-0 px-2 py-1"
                  style={{
                    fontSize: 10,
                    color: colors.muted,
                    fontFamily: 'var(--font-dm-sans), sans-serif',
                  }}
                >
                  {emptyMessage}
                </p>
              ) : (
                <>
                  {selectAllLabel ? (
                    <label
                      role="option"
                      aria-selected={allSelected}
                      style={{
                        ...optionStyle,
                        background: allSelected ? `${colors.accent}14` : 'transparent',
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allSelected}
                        className="accent-current"
                        style={{ accentColor: colors.accent }}
                        onChange={toggleSelectAll}
                      />
                      <span className="truncate">{selectAllLabel}</span>
                    </label>
                  ) : null}
                  {groups?.length
                    ? groups.map((group) => (
                        <div key={group.label}>
                          <div style={groupHeadingStyle}>{group.label}</div>
                          {group.options.map((option) => renderOption(option))}
                        </div>
                      ))
                    : allOptions.map((option) => renderOption(option))}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
