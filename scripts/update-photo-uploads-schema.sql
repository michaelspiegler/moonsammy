-- Update photo_uploads table to include profile image
-- This script adds the uploader_profile_image column

-- Add uploader_profile_image column if it doesn't exist
ALTER TABLE photo_uploads 
ADD COLUMN IF NOT EXISTS uploader_profile_image TEXT;

-- Add user_id column if it doesn't exist (for linking to user accounts)
ALTER TABLE photo_uploads 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_photo_uploads_user_id ON photo_uploads(user_id);

-- Verify the updated table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'photo_uploads'
ORDER BY ordinal_position;
