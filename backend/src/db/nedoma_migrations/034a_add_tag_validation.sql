BEGIN;

-- Create or replace the validation function for tag preferences
CREATE OR REPLACE FUNCTION validate_tag_values()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
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
$$;

-- Create a check to verify the table exists before attempting validation
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'user_tag_preferences'
    ) THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS validate_tag_values_trigger ON user_tag_preferences;

        -- Create new trigger
        CREATE TRIGGER validate_tag_values_trigger
            BEFORE INSERT OR UPDATE ON user_tag_preferences
            FOR EACH ROW
            EXECUTE FUNCTION validate_tag_values();

        -- Add GIN index for faster array operations if the column exists
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'user_tag_preferences'
            AND column_name = 'selected_values'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_selected_values 
            ON user_tag_preferences USING gin (selected_values);
        END IF;
    END IF;
END $$;

COMMIT;
