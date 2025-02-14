BEGIN;

-- Drop existing events table if it exists
DROP TABLE IF EXISTS events CASCADE;

-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    links TEXT[] DEFAULT '{}',
    relevance_start TIMESTAMP WITH TIME ZONE NOT NULL,
    event_dates TIMESTAMP WITH TIME ZONE[] NOT NULL,
    address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_free BOOLEAN NOT NULL DEFAULT true,
    price_range JSONB,
    subcategories UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add GIN index for subcategories array
CREATE INDEX idx_events_subcategories ON events USING gin(subcategories);

-- Add index for relevance_start for efficient date filtering
CREATE INDEX idx_events_relevance_start ON events(relevance_start);

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

-- Create trigger for subcategories validation
DROP TRIGGER IF EXISTS validate_event_subcategories_trigger ON events;
CREATE TRIGGER validate_event_subcategories_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_subcategories();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
DROP TRIGGER IF EXISTS update_events_updated_at_trigger ON events;
CREATE TRIGGER update_events_updated_at_trigger
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();

COMMIT;
