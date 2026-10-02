import {
  WINE_REPORT_DESCRIPTION_MAX_LENGTH,
  WINE_REPORT_ISSUE_TYPES,
  WINE_REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  WINE_REPORT_STATUSES,
  WINE_REPORT_UUID_RE,
  type WineReportIssueType,
  type WineReportStatus,
} from '@/lib/reports/constants'

export function isWineReportIssueType(value: unknown): value is WineReportIssueType {
  return typeof value === 'string' && (WINE_REPORT_ISSUE_TYPES as readonly string[]).includes(value)
}

export function isWineReportStatus(value: unknown): value is WineReportStatus {
  return typeof value === 'string' && (WINE_REPORT_STATUSES as readonly string[]).includes(value)
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && WINE_REPORT_UUID_RE.test(value)
}

export function normalizeReportDescription(
  value: unknown,
): { ok: true; description: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, description: null }
  if (typeof value !== 'string') {
    return { ok: false, error: 'Description must be text.' }
  }
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, description: null }
  if (trimmed.length > WINE_REPORT_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${WINE_REPORT_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    }
  }
  return { ok: true, description: trimmed }
}

export function normalizeResolutionNote(
  value: unknown,
): { ok: true; note: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, note: null }
  if (typeof value !== 'string') {
    return { ok: false, error: 'Resolution note must be text.' }
  }
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, note: null }
  if (trimmed.length > WINE_REPORT_RESOLUTION_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Resolution note must be ${WINE_REPORT_RESOLUTION_NOTE_MAX_LENGTH} characters or fewer.`,
    }
  }
  return { ok: true, note: trimmed }
}

export type SubmitWineReportInput = {
  wineId: unknown
  storeListingId?: unknown
  issueType: unknown
  description?: unknown
}

export type ValidatedSubmitWineReport = {
  wineId: string
  storeListingId: string | null
  issueType: WineReportIssueType
  description: string | null
}

export function validateSubmitWineReportInput(
  input: SubmitWineReportInput,
): { ok: true; data: ValidatedSubmitWineReport } | { ok: false; error: string } {
  if (!isUuid(input.wineId)) {
    return { ok: false, error: 'A valid wine is required.' }
  }

  let storeListingId: string | null = null
  if (input.storeListingId != null && input.storeListingId !== '') {
    if (!isUuid(input.storeListingId)) {
      return { ok: false, error: 'Store listing id is invalid.' }
    }
    storeListingId = input.storeListingId
  }

  if (!isWineReportIssueType(input.issueType)) {
    return { ok: false, error: 'Please select a valid issue category.' }
  }

  const descriptionResult = normalizeReportDescription(input.description)
  if (!descriptionResult.ok) return descriptionResult

  return {
    ok: true,
    data: {
      wineId: input.wineId,
      storeListingId,
      issueType: input.issueType,
      description: descriptionResult.description,
    },
  }
}
