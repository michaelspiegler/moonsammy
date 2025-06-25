-- Update database schema for persistent comments
-- This script ensures all tables have proper structure and indexes

-- Create or update photo_metadata table
CREATE TABLE IF NOT EXISTS photo_metadata (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create or update comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_photo_metadata_updated_at ON photo_metadata(updated_at);

-- Add any missing columns (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'photo_metadata' AND column_name = 'updated_at') THEN
        ALTER TABLE photo_metadata ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Sample data (optional - remove if not needed)
-- INSERT INTO photo_metadata (id, title) VALUES ('sample-photo-1', 'Sample Memory') ON CONFLICT DO NOTHING;
-- INSERT INTO comments (id, photo_id, author, content) VALUES ('sample-1', 'sample-photo-1', 'Friend', 'Great memory of Brian!') ON CONFLICT DO NOTHING;
