-- Allow AVIF uploads in the wine-images storage bucket (The Wine Box serves AVIF).

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]
WHERE id = 'wine-images';
