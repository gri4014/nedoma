BEGIN;

-- Drop existing check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'user_category_preferences' 
        AND column_name = 'level'
    ) THEN
        ALTER TABLE user_category_preferences DROP CONSTRAINT IF EXISTS user_category_preferences_level_check;
    END IF;
END $$;

-- Add new check constraint for level range 0-2
ALTER TABLE user_category_preferences 
ADD CONSTRAINT user_category_preferences_level_check 
CHECK (level >= 0 AND level <= 2);

COMMIT;
