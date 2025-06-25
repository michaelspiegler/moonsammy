-- Add users table for account system
-- This script adds the users table and related functionality

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Update comments table to optionally link to users
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

-- Update likes table to optionally link to users  
ALTER TABLE likes 
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

-- Update photo_uploads table to optionally link to users
ALTER TABLE photo_uploads 
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_user_id ON photo_uploads(user_id);

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Verify tables were created
SELECT 'users table ready' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users');

SELECT 'user_sessions table ready' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions');
