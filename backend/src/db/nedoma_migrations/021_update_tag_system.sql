BEGIN;

-- Drop type column from tags table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'type') THEN
        ALTER TABLE tags DROP COLUMN type;
    END IF;
END $$;

-- Convert any existing boolean values in user_tag_preferences to strings
UPDATE user_tag_preferences
SET value = CASE 
    WHEN value::text = 'true' THEN 'true'
    WHEN value::text = 'false' THEN 'false'
    ELSE value::text
END;

-- Alter user_tag_preferences to enforce string values
ALTER TABLE user_tag_preferences 
  ALTER COLUMN value TYPE text,
  ALTER COLUMN value SET NOT NULL;

-- Add constraint to ensure value exists in tag's possible_values
CREATE OR REPLACE FUNCTION validate_tag_value()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tags 
        WHERE id = NEW.tag_id 
        AND NEW.value = ANY(possible_values)
    ) THEN
        RAISE EXCEPTION 'Invalid tag value. Value must be one of the tag''s possible values.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_tag_value_trigger ON user_tag_preferences;

-- Create new trigger
CREATE TRIGGER validate_tag_value_trigger
    BEFORE INSERT OR UPDATE ON user_tag_preferences
    FOR EACH ROW
    EXECUTE FUNCTION validate_tag_value();

-- Add GIN index for faster array operations on possible_values
CREATE INDEX IF NOT EXISTS idx_tags_possible_values ON tags USING gin (possible_values);

COMMIT;
