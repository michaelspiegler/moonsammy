-- Fixed database schema for persistent comments
-- This script properly handles existing tables and columns

-- Create photo_metadata table (without updated_at initially)
CREATE TABLE IF NOT EXISTS photo_metadata (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add updated_at column if it doesn't exist (PostgreSQL compatible)
ALTER TABLE photo_metadata 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_photo_metadata_updated_at ON photo_metadata(updated_at);

-- Verify tables were created successfully
SELECT 'photo_metadata table ready' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_metadata');

SELECT 'comments table ready' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments');

-- Show current table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('photo_metadata', 'comments')
ORDER BY table_name, ordinal_position;
