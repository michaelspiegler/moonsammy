-- Debug admin access for wimpymilkshake@hotmail.com
SELECT 'User Details' as section, id, name, email, role, created_at, updated_at 
FROM users 
WHERE email = 'wimpymilkshake@hotmail.com';

-- Check active sessions for this user
SELECT 'Active Sessions' as section, s.id as session_id, s.user_id, s.expires_at, u.name, u.email, u.role
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE u.email = 'wimpymilkshake@hotmail.com'
AND s.expires_at > NOW();

-- Check all admin users
SELECT 'All Admin Users' as section, id, name, email, role, created_at
FROM users 
WHERE role = 'Admin';

-- Force update the role (in case the previous script didn't work)
UPDATE users 
SET role = 'Admin', updated_at = NOW()
WHERE email = 'wimpymilkshake@hotmail.com';

-- Verify the update worked
SELECT 'Updated User' as section, id, name, email, role, updated_at
FROM users 
WHERE email = 'wimpymilkshake@hotmail.com';
