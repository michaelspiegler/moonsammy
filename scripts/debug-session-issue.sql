-- Debug session and role issues for wimpymilkshake@hotmail.com

-- 1. Check user details and role
SELECT 'User Details' as section, 
       id, name, email, role, created_at, updated_at 
FROM users 
WHERE email = 'wimpymilkshake@hotmail.com';

-- 2. Check all active sessions for this user
SELECT 'Active Sessions' as section,
       s.id as session_id, 
       s.user_id, 
       s.expires_at,
       s.created_at,
       u.name, 
       u.email, 
       u.role,
       CASE 
         WHEN s.expires_at > NOW() THEN 'VALID'
         ELSE 'EXPIRED'
       END as status
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE u.email = 'wimpymilkshake@hotmail.com'
ORDER BY s.created_at DESC;

-- 3. Force update role to Admin (in case it's not set)
UPDATE users 
SET role = 'Admin', updated_at = NOW()
WHERE email = 'wimpymilkshake@hotmail.com';

-- 4. Clean up any expired sessions
DELETE FROM user_sessions 
WHERE expires_at <= NOW();

-- 5. Verify the user is now properly set as Admin
SELECT 'Final User State' as section,
       id, name, email, role, updated_at
FROM users 
WHERE email = 'wimpymilkshake@hotmail.com';

-- 6. Show all current admin users
SELECT 'All Admin Users' as section,
       id, name, email, role, created_at
FROM users 
WHERE role = 'Admin'
ORDER BY created_at;
