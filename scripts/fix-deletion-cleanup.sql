-- First, let's see what tables we have and their relationships
-- This will help us identify all the places where photo references exist

-- Check for any orphaned records (photos that don't exist but have references)
SELECT 'photo_tags orphans' as table_name, COUNT(*) as count
FROM photo_tags pt
LEFT JOIN photo_metadata pm ON pt.photo_id = pm.id
WHERE pm.id IS NULL

UNION ALL

SELECT 'comments orphans' as table_name, COUNT(*) as count  
FROM comments c
LEFT JOIN photo_metadata pm ON c.photo_id = pm.id
WHERE pm.id IS NULL

UNION ALL

SELECT 'likes orphans' as table_name, COUNT(*) as count
FROM likes l
LEFT JOIN photo_metadata pm ON l.photo_id = pm.id  
WHERE pm.id IS NULL

UNION ALL

SELECT 'photo_uploads orphans' as table_name, COUNT(*) as count
FROM photo_uploads pu
LEFT JOIN photo_metadata pm ON pu.id = pm.id
WHERE pm.id IS NULL;

-- Clean up any existing orphaned records
DELETE FROM photo_tags 
WHERE photo_id NOT IN (SELECT id FROM photo_metadata);

DELETE FROM comments 
WHERE photo_id NOT IN (SELECT id FROM photo_metadata);

DELETE FROM likes 
WHERE photo_id NOT IN (SELECT id FROM photo_metadata);

DELETE FROM photo_uploads 
WHERE id NOT IN (SELECT id FROM photo_metadata);

-- Add foreign key constraints to prevent future orphans (if they don't exist)
-- Note: This might fail if there are still orphaned records, run the cleanup above first

DO $$ 
BEGIN
    -- Add foreign key for photo_tags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'photo_tags_photo_id_fkey'
    ) THEN
        ALTER TABLE photo_tags 
        ADD CONSTRAINT photo_tags_photo_id_fkey 
        FOREIGN KEY (photo_id) REFERENCES photo_metadata(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for comments  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comments_photo_id_fkey'
    ) THEN
        ALTER TABLE comments 
        ADD CONSTRAINT comments_photo_id_fkey 
        FOREIGN KEY (photo_id) REFERENCES photo_metadata(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for likes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'likes_photo_id_fkey'
    ) THEN
        ALTER TABLE likes 
        ADD CONSTRAINT likes_photo_id_fkey 
        FOREIGN KEY (photo_id) REFERENCES photo_metadata(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for photo_uploads
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'photo_uploads_id_fkey'
    ) THEN
        ALTER TABLE photo_uploads 
        ADD CONSTRAINT photo_uploads_id_fkey 
        FOREIGN KEY (id) REFERENCES photo_metadata(id) ON DELETE CASCADE;
    END IF;

EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Some foreign keys could not be added. This is normal if orphaned data still exists.';
END $$;
