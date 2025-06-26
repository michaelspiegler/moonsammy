-- Add role-based access control to users table
-- This script adds roles and updates the admin system

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Member';

-- Update existing users to have Member role by default
UPDATE users 
SET role = 'Member' 
WHERE role IS NULL OR role = '';

-- Create an index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- You can manually promote a user to Admin by running:
-- UPDATE users SET role = 'Admin' WHERE email = 'your-admin-email@example.com';

-- Verify the role column was added
SELECT 'Role column added successfully' as status 
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'users' AND column_name = 'role'
);

-- Show current user roles
SELECT id, name, email, role, created_at 
FROM users 
ORDER BY role DESC, created_at DESC;
