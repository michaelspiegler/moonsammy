-- Promote the first admin user
-- This script promotes wimpymilkshake@hotmail.com to Admin role

-- Update the specific user to Admin role
UPDATE users 
SET role = 'Admin', updated_at = NOW()
WHERE email = 'wimpymilkshake@hotmail.com';

-- Verify the promotion was successful
SELECT 
  id, 
  name, 
  email, 
  role, 
  created_at, 
  updated_at
FROM users 
WHERE email = 'wimpymilkshake@hotmail.com';

-- Show all admin users for confirmation
SELECT 
  id, 
  name, 
  email, 
  role, 
  created_at
FROM users 
WHERE role = 'Admin'
ORDER BY created_at;

-- If the user doesn't exist yet, you can check all users:
-- SELECT id, name, email, role FROM users ORDER BY created_at;
