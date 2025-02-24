BEGIN;

-- Add display_order column to subcategories table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'subcategories' 
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE subcategories
        ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

COMMIT;
