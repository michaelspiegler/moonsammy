-- Add year and tags functionality to photos
-- This script adds year field and creates tags system

-- Add year column to photo_metadata
ALTER TABLE photo_metadata ADD COLUMN IF NOT EXISTS year INTEGER;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create photo_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS photo_tags (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(photo_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photo_tags_photo_id ON photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tag_id ON photo_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_photo_metadata_year ON photo_metadata(year);

-- Sample tags (optional - remove if not needed)
-- INSERT INTO tags (id, name) VALUES 
--   ('tag_family', 'Family'),
--   ('tag_friends', 'Friends'),
--   ('tag_work', 'Work'),
--   ('tag_travel', 'Travel'),
--   ('tag_holidays', 'Holidays')
-- ON CONFLICT (name) DO NOTHING;
