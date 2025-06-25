-- Debug script to check session state and identify authentication issues

-- 1. Show all active user sessions
SELECT 
  s.id as session_id,
  s.user_id,
  u.name as user_name,
  u.email,
  s.created_at,
  s.expires_at,
  CASE 
    WHEN s.expires_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status,
  EXTRACT(EPOCH FROM (s.expires_at - NOW()))/3600 as hours_until_expiry
FROM user_sessions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC
LIMIT 20;

-- 2. Show recent photo uploads and their attribution
SELECT 
  pu.id as photo_id,
  pu.uploader_name,
  pu.user_id,
  pu.uploaded_at,
  pu.original_filename,
  u.name as actual_user_name,
  CASE 
    WHEN pu.user_id IS NOT NULL AND u.id IS NOT NULL THEN 'ATTRIBUTED'
    WHEN pu.user_id IS NULL THEN 'ANONYMOUS'
    ELSE 'ORPHANED'
  END as attribution_status
FROM photo_uploads pu
LEFT JOIN users u ON pu.user_id = u.id
ORDER BY pu.uploaded_at DESC
LIMIT 10;

-- 3. Check for any orphaned sessions (sessions without users)
SELECT 
  s.id as orphaned_session_id,
  s.user_id,
  s.created_at,
  s.expires_at
FROM user_sessions s
LEFT JOIN users u ON s.user_id = u.id
WHERE u.id IS NULL;

-- 4. Show user account details
SELECT 
  u.id,
  u.name,
  u.email,
  u.profile_image_url,
  COUNT(s.id) as active_sessions,
  COUNT(pu.id) as total_uploads
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.expires_at > NOW()
LEFT JOIN photo_uploads pu ON u.id = pu.user_id
GROUP BY u.id, u.name, u.email, u.profile_image_url
ORDER BY u.name;

-- 5. Clean up any expired sessions
DELETE FROM user_sessions WHERE expires_at <= NOW();

-- 6. Show summary statistics
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 
  'Active Sessions' as metric,
  COUNT(*) as count
FROM user_sessions WHERE expires_at > NOW()
UNION ALL
SELECT 
  'Total Photo Uploads' as metric,
  COUNT(*) as count
FROM photo_uploads
UNION ALL
SELECT 
  'Anonymous Uploads' as metric,
  COUNT(*) as count
FROM photo_uploads WHERE user_id IS NULL;
