-- Fix photo_tags foreign key constraints
-- The issue is that photo_tags.photo_id should reference photo_uploads.id, not the blob filename

-- First, let's see what we're working with
SELECT 'Current photo_tags structure:' as info;
\d photo_tags;

SELECT 'Current photo_uploads structure:' as info;
\d photo_uploads;

-- Drop the existing foreign key constraint if it exists
ALTER TABLE photo_tags DROP CONSTRAINT IF EXISTS photo_tags_photo_id_fkey;

-- The photo_id in photo_tags should match the id field in photo_uploads
-- Since photo_uploads.id is the blob filename, we need to ensure consistency

-- Let's check if there are any orphaned records
SELECT 'Orphaned photo_tags records:' as info;
SELECT pt.photo_id, pt.tag_id 
FROM photo_tags pt 
LEFT JOIN photo_uploads pu ON pt.photo_id = pu.id 
WHERE pu.id IS NULL;

-- Clean up any orphaned photo_tags records
DELETE FROM photo_tags 
WHERE photo_id NOT IN (SELECT id FROM photo_uploads);

-- Add the correct foreign key constraint
ALTER TABLE photo_tags 
ADD CONSTRAINT photo_tags_photo_id_fkey 
FOREIGN KEY (photo_id) REFERENCES photo_uploads(id) ON DELETE CASCADE;

-- Also ensure photo_metadata references photo_uploads correctly
ALTER TABLE photo_metadata DROP CONSTRAINT IF EXISTS photo_metadata_id_fkey;
ALTER TABLE photo_metadata 
ADD CONSTRAINT photo_metadata_id_fkey 
FOREIGN KEY (id) REFERENCES photo_uploads(id) ON DELETE CASCADE;

-- Verify the constraints are working
SELECT 'Verification - photo_tags constraints:' as info;
SELECT conname, contype, confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid = 'photo_tags'::regclass;

SELECT 'Verification - photo_metadata constraints:' as info;
SELECT conname, contype, confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid = 'photo_metadata'::regclass;
