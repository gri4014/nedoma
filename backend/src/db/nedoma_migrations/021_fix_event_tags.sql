BEGIN;

-- Drop existing event_tags table if it exists
DROP TABLE IF EXISTS event_tags CASCADE;

-- Create event_tags table with proper structure
CREATE TABLE event_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_event_tags_event_id ON event_tags(event_id);
CREATE INDEX idx_event_tags_tag_id ON event_tags(tag_id);

-- Add unique constraint to prevent duplicate tag assignments
CREATE UNIQUE INDEX idx_event_tags_unique ON event_tags(event_id, tag_id);

COMMIT;
