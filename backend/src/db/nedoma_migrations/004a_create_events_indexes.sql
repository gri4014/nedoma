BEGIN;

-- Create indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_relevance_start ON events(relevance_start);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_is_free ON events(is_free);

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
