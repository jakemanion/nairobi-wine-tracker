import { afterEach, describe, expect, it } from 'vitest'
import {
  firstListingImageUrl,
  getWineImagePublicUrl,
  resolveListingImageUrl,
  resolveWineAdminImage,
  resolveWineDisplayImage,
  resolveWineHostedImageUrl,
  wineImageStoragePath,
} from '@/lib/wine-images'

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL
})

describe('wineImageStoragePath', () => {
  it('builds a stable wine path', () => {
    expect(wineImageStoragePath('abc-123', 'jpg')).toBe('abc-123/original.jpg')
    expect(wineImageStoragePath('abc-123', '.PNG')).toBe('abc-123/original.png')
  })
})

describe('getWineImagePublicUrl', () => {
  it('builds a public storage URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    expect(getWineImagePublicUrl('abc/original.jpg')).toBe(
      'https://example.supabase.co/storage/v1/object/public/wine-images/abc/original.jpg',
    )
  })

  it('rejects empty paths', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    expect(getWineImagePublicUrl('')).toBeNull()
    expect(getWineImagePublicUrl(null)).toBeNull()
  })
})

describe('resolveWineHostedImageUrl', () => {
  it('returns hosted URL only when migration succeeded', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    expect(
      resolveWineHostedImageUrl({
        hosted_image_path: 'w1/original.jpg',
        image_migration_status: 'success',
      }),
    ).toBe('https://example.supabase.co/storage/v1/object/public/wine-images/w1/original.jpg')

    expect(
      resolveWineHostedImageUrl({
        hosted_image_path: 'w1/original.jpg',
        image_migration_status: 'failed',
      }),
    ).toBeNull()
  })
})

describe('resolveListingImageUrl', () => {
  it('returns only the retailer URL', () => {
    expect(
      resolveListingImageUrl({
        image_url: 'https://retailer.example/a.jpg',
      }),
    ).toBe('https://retailer.example/a.jpg')
  })
})

describe('resolveWineDisplayImage', () => {
  const originalFlag = process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES
    else process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES = originalFlag
  })

  it('prefers hosted image when available', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    delete process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES
    expect(
      resolveWineDisplayImage({
        hosted_image_path: 'w1/original.jpg',
        image_migration_status: 'success',
        store_listings: [{ image_url: 'https://retailer.example/a.jpg' }],
      }),
    ).toBe('https://example.supabase.co/storage/v1/object/public/wine-images/w1/original.jpg')
  })

  it('falls back to retailer URL when not migrated', () => {
    expect(
      resolveWineDisplayImage({
        hosted_image_path: null,
        image_migration_status: 'failed',
        store_listings: [{ image_url: 'https://retailer.example/a.jpg' }],
      }),
    ).toBe('https://retailer.example/a.jpg')
  })

  it('honors kill switch NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES=false', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES = 'false'
    expect(
      resolveWineDisplayImage({
        hosted_image_path: 'w1/original.jpg',
        image_migration_status: 'success',
        store_listings: [{ image_url: 'https://retailer.example/a.jpg' }],
      }),
    ).toBe('https://retailer.example/a.jpg')
  })
})

describe('firstListingImageUrl', () => {
  it('returns the first retailer listing image', () => {
    expect(
      firstListingImageUrl([
        { image_url: null },
        { image_url: 'https://retailer.example/b.jpg' },
      ]),
    ).toBe('https://retailer.example/b.jpg')
  })
})

describe('resolveWineAdminImage', () => {
  it('returns hosted storage URL for admin preview', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    expect(
      resolveWineAdminImage({
        hosted_image_path: 'w1/original.jpg',
        image_migration_status: 'success',
      }),
    ).toBe('https://example.supabase.co/storage/v1/object/public/wine-images/w1/original.jpg')
  })

  it('does not fall back to retailer URLs', () => {
    expect(
      resolveWineAdminImage({
        hosted_image_path: null,
        image_migration_status: null,
      }),
    ).toBeNull()
  })
})
