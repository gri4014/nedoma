BEGIN;

-- Add subcategories array column to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS subcategories UUID[] NOT NULL DEFAULT '{}';

-- Add index for faster array operations
CREATE INDEX IF NOT EXISTS idx_events_subcategories ON events USING gin (subcategories);

-- Create function to validate subcategories
CREATE OR REPLACE FUNCTION validate_event_subcategories()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if all subcategories exist in categories table
    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.subcategories) AS subcategory_id
        LEFT JOIN categories ON categories.id = subcategory_id
        WHERE categories.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory ID found';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate subcategories on insert/update
DROP TRIGGER IF EXISTS validate_event_subcategories_trigger ON events;
CREATE TRIGGER validate_event_subcategories_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_subcategories();

COMMIT;
