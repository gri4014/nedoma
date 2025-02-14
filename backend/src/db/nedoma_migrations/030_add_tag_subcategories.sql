BEGIN;

-- Create enum type if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tag_type') THEN
        CREATE TYPE tag_type AS ENUM ('boolean', 'categorical');
    END IF;
END $$;

-- Add subcategories array column to tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS subcategories UUID[] DEFAULT '{}';

-- Create index for subcategories array
CREATE INDEX IF NOT EXISTS idx_tags_subcategories ON tags USING gin (subcategories);

-- Update validate_event_tag function to check subcategories
CREATE OR REPLACE FUNCTION validate_event_tag()
RETURNS TRIGGER AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
    tag_subcategories UUID[];
    event_subcategories UUID[];
BEGIN
    -- Get tag info
    SELECT type, possible_values, subcategories INTO tag_type_val, possible_values_arr, tag_subcategories
    FROM tags WHERE id = NEW.tag_id;
    
    -- Get event subcategories
    SELECT subcategories INTO event_subcategories
    FROM events WHERE id = NEW.event_id;
    
    -- Validate tag values based on type
    IF tag_type_val = 'boolean' THEN
        IF array_length(NEW.tag_values, 1) != 1 OR NEW.tag_values[1] NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag must have exactly one value: true or false';
        END IF;
    ELSIF tag_type_val = 'categorical' AND possible_values_arr IS NOT NULL THEN
        IF NOT (SELECT bool_and(val = ANY(possible_values_arr)) FROM unnest(NEW.tag_values) AS val) THEN
            RAISE EXCEPTION 'Categorical tag values must be from the possible values list';
        END IF;
    END IF;
    
    -- Validate that tag is applicable to at least one of event's subcategories
    IF NOT (
        SELECT EXISTS (
            SELECT 1 
            FROM unnest(event_subcategories) AS event_subcat
            WHERE event_subcat = ANY(tag_subcategories)
        )
    ) THEN
        RAISE EXCEPTION 'Tag is not applicable to any of the event subcategories';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS validate_event_tag ON event_tags;
CREATE TRIGGER validate_event_tag
    BEFORE INSERT OR UPDATE ON event_tags
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_tag();

COMMIT;
