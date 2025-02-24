BEGIN;

-- First check if the subcategory_id column exists to avoid errors if migration was partially run before
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_category_preferences' 
        AND column_name = 'subcategory_id'
    ) THEN
        -- Drop existing foreign key constraint
        ALTER TABLE user_category_preferences
        DROP CONSTRAINT IF EXISTS user_category_preferences_category_id_fkey;

        -- Rename category_id to subcategory_id
        ALTER TABLE user_category_preferences 
        RENAME COLUMN category_id TO subcategory_id;

        -- Add new foreign key constraint referencing subcategories table
        ALTER TABLE user_category_preferences
        ADD CONSTRAINT user_category_preferences_subcategory_id_fkey 
        FOREIGN KEY (subcategory_id) 
        REFERENCES subcategories(id) 
        ON DELETE CASCADE;
    END IF;

    -- Rename interest_level to level if it hasn't been done already
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_category_preferences' 
        AND column_name = 'interest_level'
    ) THEN
        ALTER TABLE user_category_preferences 
        RENAME COLUMN interest_level TO level;
    END IF;
END $$;

COMMIT;
