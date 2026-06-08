import { supabase } from '@/lib/supabase'

export type WineRecord = {
  id: string
  producer: string | null
  wine_name: string | null
  vintage: string | number | null
  country: string | null
  region: string | null
  grape_varieties: unknown
  style: string | null
  vivino_url: string | null
  vivino_rating: string | number | null
}

export type WineField = keyof Omit<WineRecord, 'id'>

const wineSelect = `
  id,
  producer,
  wine_name,
  vintage,
  country,
  region,
  grape_varieties,
  style,
  vivino_url,
  vivino_rating
`

type UpdateWineFieldArgs = {
  wineId: string
  field: WineField
  value: string | number | string[] | null
}

type WineMutationResult =
  | { wine: WineRecord; error?: undefined }
  | { wine?: undefined; error: string }

export function formatWineLabel(wine: {
  producer?: string | null
  wine_name?: string | null
  vintage?: string | number | null
}): string {
  const parts = [wine.producer, wine.wine_name, wine.vintage]
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)

  return parts.length ? parts.join(' · ') : '(unnamed wine)'
}

export async function updateWineField({
  wineId,
  field,
  value,
}: UpdateWineFieldArgs): Promise<WineMutationResult> {
  const { data, error } = await supabase
    .from('wines')
    .update({ [field]: value })
    .eq('id', wineId)
    .select(wineSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Update failed.' }

  return { wine: data as WineRecord }
}

export async function createWine(
  data: Partial<Omit<WineRecord, 'id'>> = {},
): Promise<WineMutationResult> {
  const { data: wine, error } = await supabase
    .from('wines')
    .insert(data)
    .select(wineSelect)
    .single()

  if (error) return { error: error.message }

  return { wine: wine as WineRecord }
}
