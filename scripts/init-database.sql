-- Initialize database tables for Brian Quain Memorial Gallery

-- Photo metadata table
CREATE TABLE IF NOT EXISTS photo_metadata (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comments table
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

-- Insert sample data (optional)
-- INSERT INTO photo_metadata (id, title) VALUES ('sample-photo-1', 'Sample Memory');
-- INSERT INTO comments (id, photo_id, author, content) VALUES ('1', 'sample-photo-1', 'Friend', 'Great memory of Brian!');
