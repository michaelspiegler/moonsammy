-- Add likes table for heart/love functionality
-- This script adds the likes table and indexes

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(photo_id, author)  -- Prevent duplicate likes from same person
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at);
CREATE INDEX IF NOT EXISTS idx_likes_author ON likes(author);

-- Verify table was created
SELECT 'likes table ready' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'likes');

-- Show current table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'likes'
ORDER BY ordinal_position;
