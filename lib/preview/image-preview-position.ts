const PREVIEW_MAX_WIDTH = 320
const PREVIEW_MAX_HEIGHT = 480

/** Place a large image preview to the left of the cursor, falling back right if needed. */
export function placeImagePreviewLeftOfCursor(clientX: number, clientY: number) {
  const gap = 18
  let left = clientX - PREVIEW_MAX_WIDTH - gap
  let top = clientY - PREVIEW_MAX_HEIGHT / 2

  if (left < 12) {
    left = clientX + gap
  }
  if (left + PREVIEW_MAX_WIDTH > window.innerWidth - 12) {
    left = Math.max(12, window.innerWidth - PREVIEW_MAX_WIDTH - 12)
  }

  if (top < 12) top = 12
  if (top + PREVIEW_MAX_HEIGHT > window.innerHeight - 12) {
    top = window.innerHeight - PREVIEW_MAX_HEIGHT - 12
  }

  return { left, top, maxWidth: PREVIEW_MAX_WIDTH, maxHeight: PREVIEW_MAX_HEIGHT }
}
