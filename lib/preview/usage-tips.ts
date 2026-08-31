export type UsageTipId =
  | 'wishlist-button'
  | 'tried-button'
  | 'notes-textfield'
  | 'shortlist-button'
  | 'highest-price-filter'
  | 'lowest-rating-filter'
  | 'grapes-filter'
  | 'countries-filter'
  | 'my-wines-filters'
  | 'shops-filter'
  | 'hide-wine'
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
    heading: 'Wishlist',
    body: 'Heart a wine to add it to your wishlist.',
  },
  'tried-button': {
    id: 'tried-button',
    heading: 'Tried it?',
    body: 'Thumbs up wines you liked, thumbs down ones you didn\'t.',
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
  'highest-price-filter': {
    id: 'highest-price-filter',
    heading: 'Highest price',
    body: "Set the highest price you're looking at paying.",
  },
  'lowest-rating-filter': {
    id: 'lowest-rating-filter',
    heading: 'Lowest rating',
    body: "Set the lowest-rated wines you're considering.",
  },
  'grapes-filter': {
    id: 'grapes-filter',
    heading: 'Grapes',
    body: 'Select specific grapes you like.',
  },
  'countries-filter': {
    id: 'countries-filter',
    heading: 'Countries',
    body: 'Filter to wines from specific countries.',
  },
  'my-wines-filters': {
    id: 'my-wines-filters',
    heading: 'My Wines',
    body: "Show only wines on your wishlist or shortlist, or those you'd buy again—and hide wines you're not interested in.",
    estimatedHeight: 148,
  },
  'shops-filter': {
    id: 'shops-filter',
    heading: 'Shops',
    body: 'Show wines available in specific shops.',
  },
  'hide-wine': {
    id: 'hide-wine',
    heading: 'Not interested',
    body: "Mark this wine if it doesn't interest you.",
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
