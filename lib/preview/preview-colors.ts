export type PreviewThemeMode = 'dark' | 'light'
export type PreviewVisualStyle = 'classic' | 'trial'

export const VISUAL_STYLE_STORAGE_KEY = 'wine-diviner-visual-style'

export type PreviewColors = {
  pageBg: string
  headerBg: string
  headerBorder: string
  headerShadow: string
  headerTitle: string
  headerSub: string
  surfaceTitle: string
  surfaceSub: string
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
  priceAmount: string
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
  wineInfoBg: string
  wineInfoSheen: string
  accent: string
  errorText: string
  controlIdleBg: string
  controlIdleBorder: string
  controlIdleIcon: string
  controlShadow: string
  cardRadius: string
  buttonRadius: string
  panelRadius: string
  infoOnDark: boolean
  headerNavTheme: PreviewThemeMode
}

const classicChrome = {
  accent: '#C93048',
  errorText: '#c05050',
  controlIdleBg: '#22222C',
  controlIdleBorder: '#3A3848',
  controlIdleIcon: '#9894A4',
  controlShadow: '0 2px 8px rgba(0,0,0,0.4)',
  cardRadius: '0 12px 12px 12px',
  buttonRadius: '8px',
  panelRadius: '8px',
  priceAmount: '#FFFFFF',
  infoOnDark: true,
} as const

const dark: PreviewColors = {
  pageBg: '#14141A',
  headerBg: '#0E0E12',
  headerBorder: '#2A2A34',
  headerShadow: '0 2px 16px rgba(0,0,0,0.6)',
  headerTitle: '#F5F2EC',
  headerSub: '#A8A4B8',
  surfaceTitle: '#F5F2EC',
  surfaceSub: '#A8A4B8',
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
  wineInfoBg:
    'linear-gradient(168deg, #060608 0%, #121214 24%, #2a2a30 48%, #1c1c20 72%, #08080a 100%)',
  wineInfoSheen:
    'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.05), inset 12px 0 32px rgba(255,255,255,0.04), inset -4px 0 16px rgba(0,0,0,0.25)',
  headerNavTheme: 'dark',
  ...classicChrome,
}

const light: PreviewColors = {
  pageBg: '#F0EEEA',
  headerBg: '#FFFFFF',
  headerBorder: '#DDD8D0',
  headerShadow: '0 2px 12px rgba(0,0,0,0.08)',
  headerTitle: '#1A1814',
  headerSub: '#6A6560',
  surfaceTitle: '#1A1814',
  surfaceSub: '#6A6560',
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
  wineInfoBg:
    'linear-gradient(168deg, #0a0a0c 0%, #161618 24%, #2c2c32 48%, #1a1a1e 72%, #08080a 100%)',
  wineInfoSheen:
    'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.05), inset 12px 0 32px rgba(255,255,255,0.04), inset -4px 0 16px rgba(0,0,0,0.2)',
  headerNavTheme: 'light',
  ...classicChrome,
}

const trial: PreviewColors = {
  pageBg: '#d8d6ca',
  headerBg: '#3A1218',
  headerBorder: '#2A0C12',
  headerShadow: '0 2px 18px rgba(58, 18, 24, 0.22)',
  headerTitle: '#F8F0E6',
  headerSub: '#E0C8B0',
  surfaceTitle: '#3A1218',
  surfaceSub: '#6A5044',
  buttonBg: '#FBF6EE',
  buttonBorder: '#D4C4B0',
  buttonText: '#4A2C22',
  toolbarBg: '#e9e6e1',
  toolbarBorder: '#E2D4C4',
  toolbarBorderActive: '#8B1E3F',
  searchBg: '#FFFDF8',
  searchBorder: '#D9C8B8',
  searchText: '#2A1814',
  searchPlaceholder: '#9A8070',
  summaryText: '#6A5044',
  summaryStrong: '#3A1218',
  cardBg: '#FFF9F2',
  cardBorder: '#E4D5C6',
  cardShadow: '0 2px 8px rgba(58, 18, 24, 0.12)',
  imageColumnBg: '#F0E4D6',
  infoBorder: '#E8D8C8',
  producer: '#8B1E3F',
  wineName: '#2A1410',
  muted: '#6A564C',
  grapeBg: '#F3E8DC',
  grapeBorder: '#E0D0C0',
  grapeText: '#4A3A34',
  priceMuted: '#8A7064',
  priceLow: '#8B1E3F',
  priceShop: '#8A7468',
  notesBg: '#FFFDF8',
  notesBorder: '#E0D0C0',
  notesText: '#2A1410',
  labelMuted: '#7A6054',
  ratingValue: '#2A1410',
  emptyText: '#8A7468',
  pickerPanelBg: '#FFF9F2',
  pickerPanelBorder: '#E0D0C0',
  pickerLabel: '#3A1218',
  previewShellBg: '#FFF9F2',
  previewShellBorder: '#E0D0C0',
  wineInfoBg: '#e9e6e1',
  wineInfoSheen: 'inset 0 1px 0 rgba(255,255,255,0.85)',
  accent: '#8B1E3F',
  errorText: '#A03038',
  controlIdleBg: '#FBF6EE',
  controlIdleBorder: '#D4C4B0',
  controlIdleIcon: '#8A7468',
  controlShadow: '0 1px 4px rgba(58, 18, 24, 0.12)',
  cardRadius: '8px',
  buttonRadius: '999px',
  panelRadius: '12px',
  priceAmount: '#2A1410',
  infoOnDark: false,
  headerNavTheme: 'dark',
}

export function getPreviewColors(
  mode: PreviewThemeMode,
  visualStyle: PreviewVisualStyle = 'classic',
): PreviewColors {
  if (visualStyle === 'trial') return trial
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

export type PanelTint = 'shortlist' | 'thumbsUp' | 'wishlist' | 'none'

function usesLightSurfaces(mode: PreviewThemeMode, visualStyle: PreviewVisualStyle): boolean {
  return visualStyle === 'trial' || mode === 'light'
}

export function getReviewPanelTextColors(
  mode: PreviewThemeMode,
  tint: PanelTint,
  visualStyle: PreviewVisualStyle = 'classic',
): ReviewPanelTextColors {
  if (usesLightSurfaces(mode, visualStyle)) {
    return {
      label: visualStyle === 'trial' ? '#6A5044' : '#4A4540',
      body: visualStyle === 'trial' ? '#2A1410' : '#1A1814',
      muted: visualStyle === 'trial' ? '#6A564C' : '#5A5550',
      notesBg: visualStyle === 'trial' ? '#FFFDF8' : '#FAF9F7',
      notesBorder: visualStyle === 'trial' ? '#E0D0C0' : '#D8D4CC',
      notesText: visualStyle === 'trial' ? '#2A1410' : '#1A1814',
    }
  }

  if (tint === 'shortlist') {
    return {
      label: '#D0E0FF',
      body: '#F0F4FF',
      muted: '#A0B8E0',
      notesBg: 'rgba(0,0,0,0.25)',
      notesBorder: '#4080D0',
      notesText: '#F0F4FF',
    }
  }

  if (tint === 'thumbsUp') {
    return {
      label: '#FFF8C0',
      body: '#FFFCF0',
      muted: '#E8D890',
      notesBg: 'rgba(0,0,0,0.25)',
      notesBorder: '#D0A828',
      notesText: '#FFFCF0',
    }
  }

  if (tint === 'wishlist') {
    return {
      label: '#D8FFE0',
      body: '#F4FFF6',
      muted: '#B0E8B8',
      notesBg: 'rgba(0,0,0,0.25)',
      notesBorder: '#48C868',
      notesText: '#F8FFF8',
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
