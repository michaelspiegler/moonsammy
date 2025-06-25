-- Fix the photo_uploads table structure and constraints
-- Remove the problematic foreign key constraint if it exists
ALTER TABLE photo_uploads DROP CONSTRAINT IF EXISTS photo_uploads_id_fkey;

-- Make sure the photo_uploads table has the correct structure
CREATE TABLE IF NOT EXISTS photo_uploads (
  id TEXT PRIMARY KEY,
  uploader_name TEXT NOT NULL,
  uploader_profile_image TEXT,
  user_id TEXT,
  original_filename TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE photo_uploads ADD COLUMN IF NOT EXISTS uploader_profile_image TEXT;
ALTER TABLE photo_uploads ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add a proper foreign key constraint to users table (not self-referencing)
-- Only add if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE photo_uploads 
    ADD CONSTRAINT photo_uploads_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Show current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'photo_uploads' 
ORDER BY ordinal_position;
