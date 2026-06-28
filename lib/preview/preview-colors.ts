export type PreviewThemeMode = 'dark' | 'light'

export type PreviewColors = {
  pageBg: string
  headerBg: string
  headerBorder: string
  headerShadow: string
  headerTitle: string
  headerSub: string
  buttonBg: string
  buttonBorder: string
  buttonText: string
  toolbarBg: string
  toolbarBorder: string
  toolbarBorderActive: string
  searchBg: string
  searchBorder: string
  searchText: string
  searchPlaceholder: string
  summaryText: string
  summaryStrong: string
  cardBg: string
  cardBorder: string
  cardShadow: string
  imageColumnBg: string
  infoBorder: string
  producer: string
  wineName: string
  muted: string
  grapeBg: string
  grapeBorder: string
  grapeText: string
  priceMuted: string
  priceLow: string
  priceShop: string
  notesBg: string
  notesBorder: string
  notesText: string
  labelMuted: string
  ratingValue: string
  emptyText: string
  pickerPanelBg: string
  pickerPanelBorder: string
  pickerLabel: string
  previewShellBg: string
  previewShellBorder: string
}

const dark: PreviewColors = {
  pageBg: '#14141A',
  headerBg: '#0E0E12',
  headerBorder: '#2A2A34',
  headerShadow: '0 2px 16px rgba(0,0,0,0.6)',
  headerTitle: '#F5F2EC',
  headerSub: '#A8A4B8',
  buttonBg: '#1E1E26',
  buttonBorder: '#3A3848',
  buttonText: '#C8C4D0',
  toolbarBg: '#1A1A22',
  toolbarBorder: '#3A3848',
  toolbarBorderActive: '#4A3848',
  searchBg: '#14141A',
  searchBorder: '#3A3848',
  searchText: '#F5F2EC',
  searchPlaceholder: '#8A8898',
  summaryText: '#B0ACB8',
  summaryStrong: '#EDE8E0',
  cardBg: '#222228',
  cardBorder: '#343440',
  cardShadow: '0 6px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)',
  imageColumnBg: '#1A1A20',
  infoBorder: '#2E2E3A',
  producer: '#E85068',
  wineName: '#F5F2EC',
  muted: '#B8B4C0',
  grapeBg: '#2A2A34',
  grapeBorder: '#3A3A48',
  grapeText: '#D0CED8',
  priceMuted: '#9A98A8',
  priceLow: '#F06078',
  priceShop: '#787888',
  notesBg: 'rgba(0,0,0,0.3)',
  notesBorder: '#4A4858',
  notesText: '#E8E4DC',
  labelMuted: '#A8A4B0',
  ratingValue: '#E8E4DC',
  emptyText: '#8A8898',
  pickerPanelBg: '#1A1A22',
  pickerPanelBorder: '#4A4858',
  pickerLabel: '#E8E4DC',
  previewShellBg: '#1A1A22',
  previewShellBorder: '#4A4858',
}

const light: PreviewColors = {
  pageBg: '#F0EEEA',
  headerBg: '#FFFFFF',
  headerBorder: '#DDD8D0',
  headerShadow: '0 2px 12px rgba(0,0,0,0.08)',
  headerTitle: '#1A1814',
  headerSub: '#6A6560',
  buttonBg: '#FAF9F7',
  buttonBorder: '#D8D4CC',
  buttonText: '#4A4540',
  toolbarBg: '#FFFFFF',
  toolbarBorder: '#D8D4CC',
  toolbarBorderActive: '#C93048',
  searchBg: '#FAF9F7',
  searchBorder: '#D8D4CC',
  searchText: '#1A1814',
  searchPlaceholder: '#8A8580',
  summaryText: '#5A5550',
  summaryStrong: '#1A1814',
  cardBg: '#FFFFFF',
  cardBorder: '#D8D4CC',
  cardShadow: '0 4px 16px rgba(0,0,0,0.08)',
  imageColumnBg: '#F5F3EF',
  infoBorder: '#E8E4DC',
  producer: '#A81830',
  wineName: '#1A1814',
  muted: '#5A5550',
  grapeBg: '#F0EEEA',
  grapeBorder: '#D8D4CC',
  grapeText: '#4A4540',
  priceMuted: '#6A6560',
  priceLow: '#A81830',
  priceShop: '#8A8580',
  notesBg: '#FAF9F7',
  notesBorder: '#D8D4CC',
  notesText: '#1A1814',
  labelMuted: '#6A6560',
  ratingValue: '#1A1814',
  emptyText: '#8A8580',
  pickerPanelBg: '#FFFFFF',
  pickerPanelBorder: '#D8D4CC',
  pickerLabel: '#1A1814',
  previewShellBg: '#FFFFFF',
  previewShellBorder: '#D8D4CC',
}

export function getPreviewColors(mode: PreviewThemeMode): PreviewColors {
  return mode === 'light' ? light : dark
}

export type ReviewPanelTextColors = {
  label: string
  body: string
  muted: string
  notesBg: string
  notesBorder: string
  notesText: string
}

export function getReviewPanelTextColors(
  mode: PreviewThemeMode,
  wishlist: number | null,
): ReviewPanelTextColors {
  if (mode === 'light') {
    return {
      label: '#4A4540',
      body: '#1A1814',
      muted: '#5A5550',
      notesBg: '#FAF9F7',
      notesBorder: '#D8D4CC',
      notesText: '#1A1814',
    }
  }

  if (wishlist === 1) {
    return {
      label: '#D8FFE0',
      body: '#F4FFF6',
      muted: '#B0E8B8',
      notesBg: 'rgba(0,0,0,0.25)',
      notesBorder: '#48C868',
      notesText: '#F8FFF8',
    }
  }
  if (wishlist === 2) {
    return {
      label: '#E8EEFF',
      body: '#F8FAFF',
      muted: '#C0C8E0',
      notesBg: 'rgba(0,0,0,0.25)',
      notesBorder: '#A0A8C8',
      notesText: '#FFFFFF',
    }
  }
  if (wishlist === 3) {
    return {
      label: '#FFF8C0',
      body: '#FFFCF0',
      muted: '#F0E090',
      notesBg: 'rgba(0,0,0,0.25)',
      notesBorder: '#F0D050',
      notesText: '#FFFCF0',
    }
  }

  return {
    label: '#C8C4D0',
    body: '#F0ECE4',
    muted: '#A8A4B0',
    notesBg: 'rgba(0,0,0,0.3)',
    notesBorder: '#4A4858',
    notesText: '#F0ECE4',
  }
}
