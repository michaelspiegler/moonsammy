-- Create comprehensive activity logging system
-- This replaces admin_logs with a more comprehensive activity_logs table

-- First, let's see what we have
SELECT 'Current admin_logs count:' as info, COUNT(*) as count FROM admin_logs;

-- Create the new activity_logs table with comprehensive tracking
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- NULL for anonymous actions
  user_name TEXT, -- Store name for easier querying
  user_email TEXT, -- Store email for easier querying
  action TEXT NOT NULL, -- 'upload', 'comment_add', 'comment_delete', 'like_add', 'like_remove', 'login', 'register', 'admin_action', etc.
  target_type TEXT, -- 'photo', 'comment', 'user', 'tag', etc.
  target_id TEXT, -- ID of the target object
  details JSONB, -- Additional details about the action
  ip_address TEXT, -- User's IP address
  user_agent TEXT, -- User's browser/device info
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_type ON activity_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_id ON activity_logs(target_id);

-- Migrate existing admin_logs to activity_logs
INSERT INTO activity_logs (id, user_id, user_name, user_email, action, target_type, target_id, details, created_at)
SELECT 
  'migrated_' || id,
  NULL, -- admin actions don't have user_id in old system
  'Admin',
  'admin@system',
  action,
  target_type,
  target_id,
  details::jsonb,
  created_at
FROM admin_logs
ON CONFLICT (id) DO NOTHING;

-- Show what we migrated
SELECT 'Migrated admin logs:' as info, COUNT(*) as count FROM activity_logs WHERE id LIKE 'migrated_%';

-- Add some sample activity logs to test the system
DO $$
DECLARE
  sample_user_id TEXT;
  sample_photo_id TEXT;
BEGIN
  -- Get a sample user and photo for testing
  SELECT id INTO sample_user_id FROM users LIMIT 1;
  SELECT id INTO sample_photo_id FROM photo_uploads LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    -- Add sample login activity
    INSERT INTO activity_logs (
      id, user_id, user_name, user_email, action, target_type, target_id, 
      details, created_at
    ) VALUES (
      'sample_login_' || EXTRACT(EPOCH FROM NOW()),
      sample_user_id,
      (SELECT name FROM users WHERE id = sample_user_id),
      (SELECT email FROM users WHERE id = sample_user_id),
      'login',
      'user',
      sample_user_id,
      '{"method": "password", "success": true}'::jsonb,
      NOW() - INTERVAL '1 hour'
    ) ON CONFLICT (id) DO NOTHING;
    
    IF sample_photo_id IS NOT NULL THEN
      -- Add sample upload activity
      INSERT INTO activity_logs (
        id, user_id, user_name, user_email, action, target_type, target_id,
        details, created_at
      ) VALUES (
        'sample_upload_' || EXTRACT(EPOCH FROM NOW()),
        sample_user_id,
        (SELECT name FROM users WHERE id = sample_user_id),
        (SELECT email FROM users WHERE id = sample_user_id),
        'upload',
        'photo',
        sample_photo_id,
        '{"filename": "sample.jpg", "size": 1024000}'::jsonb,
        NOW() - INTERVAL '30 minutes'
      ) ON CONFLICT (id) DO NOTHING;
      
      -- Add sample comment activity
      INSERT INTO activity_logs (
        id, user_id, user_name, user_email, action, target_type, target_id,
        details, created_at
      ) VALUES (
        'sample_comment_' || EXTRACT(EPOCH FROM NOW()),
        sample_user_id,
        (SELECT name FROM users WHERE id = sample_user_id),
        (SELECT email FROM users WHERE id = sample_user_id),
        'comment_add',
        'photo',
        sample_photo_id,
        '{"comment": "What a beautiful memory!", "comment_id": "sample_comment_123"}'::jsonb,
        NOW() - INTERVAL '15 minutes'
      ) ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- Show final results
SELECT 'Total activity logs:' as info, COUNT(*) as count FROM activity_logs;

-- Show recent activities by type
SELECT 
  action,
  COUNT(*) as count,
  MAX(created_at) as latest_activity
FROM activity_logs 
GROUP BY action 
ORDER BY latest_activity DESC;

-- Show sample of recent activities
SELECT 
  action,
  user_name,
  target_type,
  target_id,
  created_at,
  details
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Create a helper function to log activities (optional, for future use)
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id TEXT,
  p_user_name TEXT,
  p_user_email TEXT,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  activity_id TEXT;
BEGIN
  activity_id := p_action || '_' || EXTRACT(EPOCH FROM NOW()) || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
  
  INSERT INTO activity_logs (
    id, user_id, user_name, user_email, action, target_type, target_id,
    details, ip_address, user_agent, created_at
  ) VALUES (
    activity_id, p_user_id, p_user_name, p_user_email, p_action, p_target_type, p_target_id,
    p_details, p_ip_address, p_user_agent, NOW()
  );
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Test the helper function
SELECT log_activity(
  (SELECT id FROM users LIMIT 1),
  (SELECT name FROM users LIMIT 1),
  (SELECT email FROM users LIMIT 1),
  'test_function',
  'system',
  'test',
  '{"test": true}'::jsonb
) as test_activity_id;

SELECT '✅ Activity logging system setup complete!' as status;
