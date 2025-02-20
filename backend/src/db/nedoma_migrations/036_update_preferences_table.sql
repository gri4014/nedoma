BEGIN;

DO $$
BEGIN
    -- First check if subcategory_id doesn't exist to avoid the error
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_category_preferences'
        AND column_name = 'subcategory_id'
    ) THEN
        -- First rename the old column to avoid conflicts (if it exists)
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'user_category_preferences'
            AND column_name = 'category_id'
        ) THEN
            ALTER TABLE user_category_preferences RENAME COLUMN category_id TO old_category_id;
        END IF;

        -- Drop old unique constraint if it exists
        IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'user_category_preferences_user_id_category_id_key'
        ) THEN
            ALTER TABLE user_category_preferences DROP CONSTRAINT user_category_preferences_user_id_category_id_key;
        END IF;

        -- Add new column
        ALTER TABLE user_category_preferences ADD COLUMN subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE;

        -- Create index on the new column
        CREATE INDEX IF NOT EXISTS idx_user_category_preferences_subcategory_id ON user_category_preferences(subcategory_id);

        -- Add new unique constraint
        ALTER TABLE user_category_preferences ADD CONSTRAINT user_category_preferences_user_id_subcategory_id_key UNIQUE (user_id, subcategory_id);

        -- Drop old column after moving any existing data if needed
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'user_category_preferences'
            AND column_name = 'old_category_id'
        ) THEN
            ALTER TABLE user_category_preferences DROP COLUMN old_category_id;
        END IF;
    END IF;

    -- Rename interest_level to level for consistency if it exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_category_preferences'
        AND column_name = 'interest_level'
    ) THEN
        ALTER TABLE user_category_preferences RENAME COLUMN interest_level TO level;
    END IF;
END $$;

COMMIT;
