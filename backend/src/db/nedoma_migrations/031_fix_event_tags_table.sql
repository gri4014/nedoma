BEGIN;

-- Drop the event_tags table if it exists and recreate it with proper structure
DROP TABLE IF EXISTS event_tags;

CREATE TABLE event_tags (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    selected_values TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, tag_id)
);

-- Create index for performance
CREATE INDEX idx_event_tags_values ON event_tags USING gin (selected_values array_ops);

-- Create update timestamp trigger
DROP TRIGGER IF EXISTS update_event_tags_updated_at ON event_tags;
CREATE TRIGGER update_event_tags_updated_at
    BEFORE UPDATE ON event_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
