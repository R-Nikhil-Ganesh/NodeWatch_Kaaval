-- Cache column for lazily-generated evidence thumbnails (first video frame /
-- first PDF page), rendered on first request and stored back into MinIO so
-- we don't re-render on every list/detail fetch.
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
