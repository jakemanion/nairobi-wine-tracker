-- Add hide boolean column to reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS hide boolean DEFAULT NULL;
