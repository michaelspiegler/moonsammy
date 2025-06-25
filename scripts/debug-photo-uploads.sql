-- Debug script to check photo_uploads table structure and data
-- This will help us see what's stored in the database

-- Check table structure
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'photo_uploads'
ORDER BY ordinal_position;

-- Check recent uploads and their profile images
SELECT 
    id,
    uploader_name,
    uploader_profile_image,
    user_id,
    uploaded_at,
    CASE 
        WHEN uploader_profile_image IS NOT NULL THEN 'Has Profile Image'
        ELSE 'No Profile Image'
    END as profile_status
FROM photo_uploads 
ORDER BY uploaded_at DESC 
LIMIT 10;

-- Count uploads with and without profile images
SELECT 
    COUNT(*) as total_uploads,
    COUNT(uploader_profile_image) as uploads_with_profile_image,
    COUNT(*) - COUNT(uploader_profile_image) as uploads_without_profile_image
FROM photo_uploads;

-- Show user accounts and their profile images
SELECT 
    id,
    name,
    email,
    CASE 
        WHEN profile_image_url IS NOT NULL THEN 'Has Profile Image'
        ELSE 'No Profile Image'
    END as profile_status,
    created_at
FROM users 
ORDER BY created_at DESC;
