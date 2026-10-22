'use client'

import { useEffect, useState } from 'react'
import { AGE_GATE_CONFIRMED_EVENT, AGE_GATE_STORAGE_KEY } from '@/components/preview/age-gate'
import {
  BestUnderToggles,
  ColourStyleToggles,
} from '@/components/preview/preview-toolbar-quick-filters'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import type { SortCriterion } from '@/components/wine-filter-panel'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'
import {
  GETTING_STARTED_DISMISSED_STORAGE_KEY,
  WELCOME_DISMISSED_EVENT,
  WELCOME_DISMISSED_STORAGE_KEY,
} from '@/lib/preview/usage-tips'
import { BEST_UNDER_PRICE_PRESETS, type WineFilters } from '@/lib/wine-filters'

type OnboardingStep = 'help' | 'filters'

type GettingStartedOnboardingProps = {
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  styles: string[]
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
}

function isEligibleForOnboarding(): boolean {
  try {
    const ageConfirmed = window.localStorage.getItem(AGE_GATE_STORAGE_KEY) === 'true'
    const welcomeDismissed = window.localStorage.getItem(WELCOME_DISMISSED_STORAGE_KEY) === 'true'
    const gettingStartedDismissed =
      window.localStorage.getItem(GETTING_STARTED_DISMISSED_STORAGE_KEY) === 'true'
    return ageConfirmed && welcomeDismissed && !gettingStartedDismissed
  } catch {
    return false
  }
}

function isBestUnderActive(filters: WineFilters, primarySort: SortCriterion, price: number): boolean {
  return (
    filters.priceMax.trim() === String(price) &&
    primarySort.key === 'vivino_rating' &&
    primarySort.dir === 'desc'
  )
}

function activeBestUnderPrice(filters: WineFilters, primarySort: SortCriterion): string {
  const priceMax = filters.priceMax.trim()
  if (!priceMax) return ''
  const price = Number(priceMax)
  if (!BEST_UNDER_PRICE_PRESETS.includes(price as (typeof BEST_UNDER_PRICE_PRESETS)[number])) {
    return ''
  }
  return isBestUnderActive(filters, primarySort, price) ? priceMax : ''
}

export function GettingStartedOnboarding({
  filters,
  onFiltersChange,
  styles,
  primarySort,
  onPrimarySortChange,
  onSecondarySortChange,
}: GettingStartedOnboardingProps) {
  const { colors } = usePreviewTheme()
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState<OnboardingStep | null>(null)

  useEffect(() => {
    function refresh() {
      setStep(isEligibleForOnboarding() ? 'help' : null)
      setReady(true)
    }

    refresh()
    window.addEventListener(AGE_GATE_CONFIRMED_EVENT, refresh)
    window.addEventListener(WELCOME_DISMISSED_EVENT, refresh)
    return () => {
      window.removeEventListener(AGE_GATE_CONFIRMED_EVENT, refresh)
      window.removeEventListener(WELCOME_DISMISSED_EVENT, refresh)
    }
  }, [])

  function dismissForever() {
    try {
      window.localStorage.setItem(GETTING_STARTED_DISMISSED_STORAGE_KEY, 'true')
    } catch {
      // Ignore storage write errors and continue for this session.
    }
    setStep(null)
  }

  function applyBestUnder(price: number | null) {
    if (price === null) {
      onFiltersChange({ ...filters, priceMax: '' })
      return
    }

    onFiltersChange({ ...filters, priceMax: String(price) })
    onPrimarySortChange({ key: 'vivino_rating', dir: 'desc' })
    onSecondarySortChange({ key: 'none', dir: 'asc' })
  }

  if (!ready || !step) return null

  const panelStyle = {
    background: '#ffffff',
    border: '1px solid #E4E4EE',
    boxShadow: '0 16px 48px rgba(30, 56, 40, 0.18)',
  } as const

  if (step === 'help') {
    return (
      <div
        className="fixed inset-0 z-[10950] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="getting-started-help-title"
        style={{ background: 'rgba(8, 8, 12, 0.35)' }}
      >
        <div className="w-full max-w-md rounded-xl px-5 py-6 text-center" style={panelStyle}>
          <h2
            id="getting-started-help-title"
            className="m-0 text-xl font-semibold leading-snug"
            style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Want some help getting started?
          </h2>
          <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="rounded-lg px-4 py-2.5 text-[13px] font-semibold"
              style={{
                background: BRAND_GREEN,
                border: `1px solid ${BRAND_GREEN}`,
                color: '#FFFFFF',
                fontFamily: 'var(--font-dm-sans), sans-serif',
                cursor: 'pointer',
              }}
              onClick={dismissForever}
            >
              No, let me explore
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2.5 text-[13px] font-semibold"
              style={{
                background: BRAND_GREEN,
                border: `1px solid ${BRAND_GREEN}`,
                color: '#FFFFFF',
                fontFamily: 'var(--font-dm-sans), sans-serif',
                cursor: 'pointer',
              }}
              onClick={() => setStep('filters')}
            >
              Yes, show me the ropes
            </button>
          </div>
        </div>
      </div>
    )
  }

  const bestUnderValue = activeBestUnderPrice(filters, primarySort)

  return (
    <div
      className="fixed inset-0 z-[10950] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="getting-started-filters-title"
      style={{ background: 'rgba(8, 8, 12, 0.35)' }}
    >
      <div
        className="w-full max-w-lg max-h-[min(90vh,40rem)] overflow-y-auto rounded-xl px-5 py-6 text-left"
        style={panelStyle}
      >
        <h2
          id="getting-started-filters-title"
          className="m-0 text-center text-xl font-semibold leading-snug"
          style={{ color: BRAND_GREEN, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Getting started
        </h2>
        <p
          className="m-0 mt-3 text-[13px] leading-relaxed"
          style={{ color: '#111120', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          WineDiviner is a database of almost every bottle of wine available in Nairobi. Let&apos;s
          filter that list down to what you&apos;re looking for:
        </p>
        <div className="mt-5 flex flex-col gap-4">
          <ColourStyleToggles
            colors={colors}
            styles={styles}
            filters={filters}
            label="What type of wine are you looking for?"
            labelAbove
            onChange={(next) => onFiltersChange({ ...filters, styles: next })}
          />
          <BestUnderToggles
            colors={colors}
            selectedPrice={bestUnderValue}
            label="How much are you happy to spend for a great bottle?"
            labelAbove
            onSelect={applyBestUnder}
          />
        </div>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="rounded-lg px-5 py-2.5 text-[13px] font-semibold"
            style={{
              background: BRAND_GREEN,
              border: `1px solid ${BRAND_GREEN}`,
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
            }}
            onClick={dismissForever}
          >
            Done!
          </button>
        </div>
      </div>
    </div>
  )
}
