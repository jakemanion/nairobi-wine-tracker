export type UsageTipId =
  | 'wishlist-button'
  | 'tried-button'
  | 'rating-slider'
  | 'notes-textfield'
  | 'shortlist-button'
  | 'hide-unwanted'
  | 'sort-panel'
  | 'best-under-panel'
  | 'shortlist-panel'

export type UsageTipContent = {
  id: UsageTipId
  heading: string
  body: string
  estimatedHeight?: number
}

export const USAGE_TIPS_STORAGE_KEY = 'wine-diviner-usage-tips-enabled'
export const WELCOME_DISMISSED_STORAGE_KEY = 'wine-diviner-welcome-dismissed'

export const WELCOME_PANEL = {
  heading: 'Welcome!',
  body: "WineDiviner:Nairobi helps you find the best wines in town for your money, without the guesswork. Search by rating, budget or value, and keep track of wines you've tried and those you'd like to try.",
} as const

export const USAGE_TIPS: Record<UsageTipId, UsageTipContent> = {
  'wishlist-button': {
    id: 'wishlist-button',
    heading: 'Wishlists',
    body: 'Remember wines you want to try... and hide those you wish to avoid.',
  },
  'tried-button': {
    id: 'tried-button',
    heading: 'Tried',
    body: "Keep track of wines you'd buy again, or skip next time.",
  },
  'rating-slider': {
    id: 'rating-slider',
    heading: 'Rating',
    body: 'Your personal ratings help you remember what you think of a wine.',
  },
  'notes-textfield': {
    id: 'notes-textfield',
    heading: 'Notes',
    body: 'Write a few words to help you remember what you thought of a wine.',
  },
  'shortlist-button': {
    id: 'shortlist-button',
    heading: 'Shortlist',
    body: 'Track wines which are options for your next purchase.',
  },
  'hide-unwanted': {
    id: 'hide-unwanted',
    heading: 'Hide unwanted',
    body: "Hide wines you've already ruled out.",
  },
  'sort-panel': {
    id: 'sort-panel',
    heading: 'Sort',
    body: "Sort your filtered wines however you like. Sorting by Value compares each wine's rating and price to help you quickly spot the best quality for your money.",
    estimatedHeight: 168,
  },
  'best-under-panel': {
    id: 'best-under-panel',
    heading: 'Best under...',
    body: 'Find the best-rated wines within your budget.',
  },
  'shortlist-panel': {
    id: 'shortlist-panel',
    heading: 'Your shortlist',
    body: "View every wine you've shortlisted in one place, or clear the list when you're ready to start fresh.",
    estimatedHeight: 148,
  },
}
