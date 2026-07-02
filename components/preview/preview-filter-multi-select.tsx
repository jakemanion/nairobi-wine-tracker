'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import type { PreviewColors } from '@/lib/preview/preview-colors'

const PANEL_MAX_HEIGHT = 220
const PANEL_WIDTH = 280
const PANEL_GAP = 4

type PreviewFilterMultiSelectProps = {
  colors: PreviewColors
  label: string
  emptyMessage: string
  clearLabel: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

function toggleOption(selected: string[], option: string): string[] {
  return selected.includes(option)
    ? selected.filter((item) => item !== option)
    : [...selected, option]
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

export function PreviewFilterMultiSelect({
  colors,
  label,
  emptyMessage,
  clearLabel,
  options,
  selected,
  onChange,
}: PreviewFilterMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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
    selected.length === 0
      ? label
      : selected.length === 1
        ? selected[0]
        : `${label} (${selected.length})`

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

  function toggleOpen() {
    if (!open && triggerRef.current) {
      setPanelPosition(placePanelBelowTrigger(triggerRef.current.getBoundingClientRect()))
    }
    setOpen((current) => !current)
  }

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        ref={triggerRef}
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
        onClick={toggleOpen}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {mounted && open
        ? createPortal(
            <div ref={panelRef} role="listbox" aria-multiselectable style={panelStyle}>
              {options.length === 0 ? (
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
              ) : (
                options.map((option) => {
                  const checked = selected.includes(option)
                  return (
                    <label
                      key={option}
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
                        onChange={() => onChange(toggleOption(selected, option))}
                      />
                      <span className="truncate">{option}</span>
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
                  {clearLabel}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
