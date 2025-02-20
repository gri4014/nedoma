BEGIN;

-- Drop type column from tags table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'type') THEN
        ALTER TABLE tags DROP COLUMN type;
    END IF;
END $$;

-- Create or replace the validation function for tag preferences
CREATE OR REPLACE FUNCTION validate_tag_values()
RETURNS TRIGGER AS $$
DECLARE
    possible_values_arr TEXT[];
BEGIN
    -- Get possible values for this tag
    SELECT possible_values INTO possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are in the possible values array
    IF NOT (SELECT bool_and(val = ANY(possible_values_arr))
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'Invalid tag values. Values must be among the tag''s possible values.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_tag_values_trigger ON user_tag_preferences;

-- Create new trigger if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_tag_preferences') THEN
        CREATE TRIGGER validate_tag_values_trigger
            BEFORE INSERT OR UPDATE ON user_tag_preferences
            FOR EACH ROW
            EXECUTE FUNCTION validate_tag_values();
    END IF;
END $$;

-- Add GIN index for faster array operations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags') THEN
        CREATE INDEX IF NOT EXISTS idx_tags_possible_values ON tags USING gin (possible_values);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_tag_preferences') THEN
        CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_selected_values ON user_tag_preferences USING gin (selected_values);
    END IF;
END $$;

COMMIT;
