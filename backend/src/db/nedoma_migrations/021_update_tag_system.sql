BEGIN;

-- Drop type column from tags table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'type') THEN
        ALTER TABLE tags DROP COLUMN type;
    END IF;
END $$;

-- Add GIN index for faster array operations on tags table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags') THEN
        CREATE INDEX IF NOT EXISTS idx_tags_possible_values ON tags USING gin (possible_values);
    END IF;
END $$;

COMMIT;
