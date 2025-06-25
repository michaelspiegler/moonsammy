-- Sync profile images for existing uploads
-- This script updates all photo uploads to use the current user's profile image

-- Update all photo uploads to use their user's current profile image
UPDATE photo_uploads 
SET uploader_profile_image = users.profile_image_url
FROM users 
WHERE photo_uploads.user_id = users.id 
  AND photo_uploads.user_id IS NOT NULL
  AND users.profile_image_url IS NOT NULL;

-- Show results
SELECT 
    COUNT(*) as total_uploads_updated,
    COUNT(DISTINCT user_id) as users_affected
FROM photo_uploads 
WHERE user_id IS NOT NULL 
  AND uploader_profile_image IS NOT NULL;

-- Show uploads that still need profile images
SELECT 
    COUNT(*) as uploads_without_profile_image
FROM photo_uploads 
WHERE uploader_profile_image IS NULL;
