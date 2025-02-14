BEGIN;

-- Drop existing event_tags table if it exists
DROP TABLE IF EXISTS event_tags CASCADE;

-- Create event_tags table with proper structure
CREATE TABLE event_tags (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    selected_values TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, tag_id)
);

-- Add index for faster lookups
CREATE INDEX idx_event_tags_event_id ON event_tags(event_id);
CREATE INDEX idx_event_tags_tag_id ON event_tags(tag_id);
CREATE INDEX idx_event_tags_selected_values ON event_tags USING gin(selected_values);

-- Create function to validate selected values against tag's possible values
CREATE OR REPLACE FUNCTION validate_event_tag_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if all selected values are in the tag's possible values
    IF NOT EXISTS (
        SELECT 1 FROM tags 
        WHERE id = NEW.tag_id 
        AND NEW.selected_values <@ possible_values
    ) THEN
        RAISE EXCEPTION 'Selected values must be from the tag''s possible values';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_event_tag_values_trigger ON event_tags;
CREATE TRIGGER validate_event_tag_values_trigger
    BEFORE INSERT OR UPDATE ON event_tags
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_tag_values();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_event_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
DROP TRIGGER IF EXISTS update_event_tags_updated_at_trigger ON event_tags;
CREATE TRIGGER update_event_tags_updated_at_trigger
    BEFORE UPDATE ON event_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_event_tags_updated_at();

COMMIT;
