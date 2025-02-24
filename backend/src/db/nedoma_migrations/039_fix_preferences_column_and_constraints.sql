BEGIN;

-- Check if we need to revert column name back to subcategory_id
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_category_preferences' 
        AND column_name = 'category_id'
    ) THEN
        -- Drop the existing foreign key if it exists
        ALTER TABLE user_category_preferences
        DROP CONSTRAINT IF EXISTS user_category_preferences_category_id_fkey;

        -- Rename the column back to subcategory_id
        ALTER TABLE user_category_preferences 
        RENAME COLUMN category_id TO subcategory_id;
    END IF;
END $$;

-- Drop foreign key constraint if it exists (to be safe)
ALTER TABLE user_category_preferences
DROP CONSTRAINT IF EXISTS user_category_preferences_subcategory_id_fkey;

-- Add the correct foreign key constraint referencing subcategories table
ALTER TABLE user_category_preferences
ADD CONSTRAINT user_category_preferences_subcategory_id_fkey
FOREIGN KEY (subcategory_id)
REFERENCES subcategories(id)
ON DELETE CASCADE;

COMMIT;
