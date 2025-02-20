BEGIN;

-- First, clean up any preferences that reference non-existent subcategories
DELETE FROM user_category_preferences
WHERE subcategory_id NOT IN (SELECT id FROM subcategories);

-- Drop the existing constraint if it exists
ALTER TABLE user_category_preferences 
DROP CONSTRAINT IF EXISTS user_category_preferences_subcategory_id_fkey,
DROP CONSTRAINT IF EXISTS user_category_preferences_category_id_fkey;

-- Add the correct constraint
ALTER TABLE user_category_preferences 
ADD CONSTRAINT user_category_preferences_subcategory_id_fkey 
FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE;

COMMIT;
