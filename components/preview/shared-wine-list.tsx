'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { LoginNavLink } from '@/components/auth/login-nav-link'
import { RegisterNavLink } from '@/components/auth/register-nav-link'
import { AdminVersionBadge } from '@/components/preview/admin-version-badge'
import { PreviewUserMenu } from '@/components/preview/preview-user-menu'
import { PreviewVirtualWineList } from '@/components/preview/preview-virtual-wine-list'
import { UsageTipsProvider } from '@/components/preview/usage-tips-context'
import { UsageTipsToggle } from '@/components/preview/usage-tips-toggle'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { SiteFooter } from '@/components/site-footer'
import type { WineReview, WineRow } from '@/components/wine-table'
import { toPreviewWineCard } from '@/lib/preview/wine-card-model'
import { createWineSearchIndex, hasActiveWineSearch, searchWinesFromIndex } from '@/lib/wine-search'

const PREVIEW_CONTENT_MAX_WIDTH = '54.625rem'

type DisplayWineRow = WineRow

type SharedWineListProps = {
  wines: WineRow[]
  collectionLabels: string[]
  sharePath: string
  isLoggedIn: boolean
  isAdmin?: boolean
  userId: string
  userName: string
  userEmail: string
  reportedWineIds?: string[]
}

function updateWineReview(
  wines: DisplayWineRow[],
  wineId: string,
  review: WineReview | null,
): DisplayWineRow[] {
  return wines.map((wine) =>
    wine.id === wineId || String(wine.id) === wineId
      ? { ...wine, review: review ?? undefined }
      : wine,
  )
}

export function SharedWineList({
  wines: initialWines,
  collectionLabels,
  sharePath,
  isLoggedIn,
  isAdmin = false,
  userId,
  userName,
  userEmail,
  reportedWineIds = [],
}: SharedWineListProps) {
  const { colors, visualStyle } = usePreviewTheme()
  const [wines, setWines] = useState<DisplayWineRow[]>(initialWines)
  const [searchQuery, setSearchQuery] = useState('')
  const reportedWineIdSet = useMemo(() => new Set(reportedWineIds), [reportedWineIds])

  const searchIndex = useMemo(() => createWineSearchIndex(wines), [wines])
  const searched = useMemo(() => {
    if (!hasActiveWineSearch(searchQuery)) return wines
    return searchWinesFromIndex(searchIndex, searchQuery)
  }, [wines, searchIndex, searchQuery])

  const previewWines = useMemo(() => searched.map(toPreviewWineCard), [searched])

  const winesById = useMemo(() => {
    const map = new Map<string, WineRow>()
    for (const wine of wines) {
      map.set(String(wine.id), wine)
    }
    return map
  }, [wines])

  const listGapPx = visualStyle === 'trial' ? 20 : 10

  return (
    <UsageTipsProvider>
      <div className="min-h-screen flex flex-col" data-visual-style={visualStyle} style={{ background: colors.pageBg }}>
        <div
          className="sticky top-0 z-50"
          style={{
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.headerBorder}`,
            boxShadow: colors.headerShadow,
          }}
        >
          <header
            style={{
              background: colors.headerBg,
              borderBottom: `1px solid ${colors.headerBorder}`,
            }}
          >
            <div
              className="mx-auto pl-10 pr-6 py-3 flex items-center justify-between gap-4"
              style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}
            >
              <div className="min-w-0 flex-shrink-0 flex items-center gap-2.5">
                <BrandLogo height={40} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href="/" className="no-underline min-w-0">
                      <h1
                        className="text-base font-semibold leading-none truncate"
                        style={{ color: colors.headerTitle, fontFamily: colors.headingFont }}
                      >
                        WineDiviner: Nairobi
                      </h1>
                    </Link>
                    {isAdmin ? <AdminVersionBadge colors={colors} /> : null}
                  </div>
                  <p className="text-[10px] mt-1 truncate" style={{ color: colors.headerSub }}>
                    Shared wine list
                  </p>
                </div>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: colors.searchPlaceholder }}
                />
                <input
                  type="search"
                  value={searchQuery}
                  placeholder="Search wine names and producers"
                  aria-label="Search producer or wine name"
                  className="w-full text-sm pl-8 pr-3 py-1.5 focus:outline-none"
                  style={{
                    background: colors.searchBg,
                    border: `1px solid ${colors.searchBorder}`,
                    color: colors.searchText,
                    borderRadius: colors.panelRadius,
                    fontFamily: 'var(--font-dm-sans), sans-serif',
                  }}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLoggedIn ? (
                  <PreviewUserMenu
                    colors={colors}
                    theme={colors.headerNavTheme}
                    userName={userName}
                    userEmail={userEmail}
                  />
                ) : (
                  <>
                    <UsageTipsToggle colors={colors} />
                    <LoginNavLink theme={colors.headerNavTheme} nextPath={sharePath} />
                    <RegisterNavLink theme={colors.headerNavTheme} />
                  </>
                )}
              </div>
            </div>
          </header>
        </div>

        <main
          className="mx-auto pl-10 pr-6 py-5 flex-1 w-full"
          style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}
        >
          <div
            className="px-4 py-3"
            style={{
              background: colors.toolbarBg,
              border: `1px solid ${colors.toolbarBorder}`,
              borderRadius: colors.panelRadius,
              marginBottom: listGapPx,
            }}
          >
            <h2
              className="m-0 text-sm font-semibold"
              style={{ color: colors.surfaceTitle, fontFamily: colors.headingFont }}
            >
              Shared list
            </h2>
            <p
              className="m-0 mt-1.5 text-[11px] leading-relaxed"
              style={{ color: colors.surfaceSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {isLoggedIn
                ? 'You are viewing a list from another WineDiviner user. You can still add wines to your own lists.'
                : 'You are viewing a list from another WineDiviner user. Log in or register to add wines to your own lists.'}
            </p>
            <p
              className="m-0 mt-1.5 text-[11px] leading-relaxed"
              style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              <Link
                href="/"
                className="underline underline-offset-2"
                style={{ color: colors.producer }}
              >
                Click here to see and filter all wines.
              </Link>
            </p>
            <p
              className="m-0 mt-1 text-[10px]"
              style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              Showing {previewWines.length} wine{previewWines.length === 1 ? '' : 's'}
              {collectionLabels.length > 0 ? ` · ${collectionLabels.join(' · ')}` : ''}
            </p>
          </div>

          {previewWines.length === 0 ? (
            <p className="text-center text-sm py-12" style={{ color: colors.emptyText }}>
              No wines in this shared list right now.
            </p>
          ) : (
            <PreviewVirtualWineList
              previewWines={previewWines}
              winesById={winesById}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              userId={userId}
              gapPx={listGapPx}
              resetKey={searchQuery}
              reportedWineIds={reportedWineIdSet}
              onReviewChange={(wineId, review) =>
                setWines((current) => updateWineReview(current, wineId, review))
              }
            />
          )}
        </main>
        <SiteFooter colors={colors} />
      </div>
    </UsageTipsProvider>
  )
}
