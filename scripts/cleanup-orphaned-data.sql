-- Clean up any orphaned data that might exist from previous deletions

-- Show current orphaned data before cleanup
SELECT 'Before cleanup - photo_tags orphans' as status, COUNT(*) as count
FROM photo_tags pt
LEFT JOIN photo_metadata pm ON pt.photo_id = pm.id
WHERE pm.id IS NULL

UNION ALL

SELECT 'Before cleanup - comments orphans' as status, COUNT(*) as count  
FROM comments c
LEFT JOIN photo_metadata pm ON c.photo_id = pm.id
WHERE pm.id IS NULL

UNION ALL

SELECT 'Before cleanup - likes orphans' as status, COUNT(*) as count
FROM likes l
LEFT JOIN photo_metadata pm ON l.photo_id = pm.id  
WHERE pm.id IS NULL

UNION ALL

SELECT 'Before cleanup - photo_uploads orphans' as status, COUNT(*) as count
FROM photo_uploads pu
LEFT JOIN photo_metadata pm ON pu.id = pm.id
WHERE pm.id IS NULL;

-- Clean up orphaned records
DELETE FROM photo_tags 
WHERE photo_id NOT IN (SELECT id FROM photo_metadata);

DELETE FROM comments 
WHERE photo_id NOT IN (SELECT id FROM photo_metadata);

DELETE FROM likes 
WHERE photo_id NOT IN (SELECT id FROM photo_metadata);

DELETE FROM photo_uploads 
WHERE id NOT IN (SELECT id FROM photo_metadata);

-- Show results after cleanup
SELECT 'After cleanup - photo_tags orphans' as status, COUNT(*) as count
FROM photo_tags pt
LEFT JOIN photo_metadata pm ON pt.photo_id = pm.id
WHERE pm.id IS NULL

UNION ALL

SELECT 'After cleanup - comments orphans' as status, COUNT(*) as count  
FROM comments c
LEFT JOIN photo_metadata pm ON c.photo_id = pm.id
WHERE pm.id IS NULL

UNION ALL

SELECT 'After cleanup - likes orphans' as status, COUNT(*) as count
FROM likes l
LEFT JOIN photo_metadata pm ON l.photo_id = pm.id  
WHERE pm.id IS NULL

UNION ALL

SELECT 'After cleanup - photo_uploads orphans' as status, COUNT(*) as count
FROM photo_uploads pu
LEFT JOIN photo_metadata pm ON pu.id = pm.id
WHERE pm.id IS NULL;
