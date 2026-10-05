# My wines show/hide rules

Source: filled `my-wines-filter-rules-template.csv`. Implemented in `passesMyWineToggles` in [`lib/wine-filters.ts`](../lib/wine-filters.ts).

## Rules in force

1. **One-status wines** — toggle OFF hides that status; toggle ON shows it.
2. **Bookmarked + Buy again** — show if either toggle is ON; hide only when both are OFF.
3. **Don’t buy again** — if the wine is marked don’t-buy and that toggle is OFF → **Hide** (bookmark cannot keep it visible).
4. **Ignored** — if the wine is ignored and Ignored is OFF → **Hide** (bookmark / buy-again cannot keep it visible).
5. **Otherwise OR** — show if the wine matches any other enabled status toggle (including Ignored ON when other toggles are OFF).

## Vocabulary

| Wine status | Meaning |
|---|---|
| Unmarked | no bookmark, no buy-again, no don’t-buy, not ignored |
| Bookmarked | wishlist = 1 |
| Buy again | tried_status = 1 |
| Don’t buy again | tried_status = 2 (or 3) |
| Ignored | hide = true, or wishlist = 0 |

Buy again and don’t buy again are mutually exclusive.

Filled spreadsheet copy: [`my-wines-filter-rules-template.csv`](./my-wines-filter-rules-template.csv).
