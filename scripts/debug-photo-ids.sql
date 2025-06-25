-- Debug photo IDs to understand the format mismatch
SELECT 
  id,
  LENGTH(id) as id_length,
  CASE 
    WHEN id LIKE '%-%' THEN 'Contains dash'
    ELSE 'No dash'
  END as format_type,
  created_at
FROM photo_uploads 
ORDER BY created_at DESC 
LIMIT 10;

-- Show all photo IDs for debugging
SELECT id FROM photo_uploads ORDER BY created_at DESC;
