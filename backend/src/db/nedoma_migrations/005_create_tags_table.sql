BEGIN;

-- Create enum type
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tag_type') THEN
        CREATE TYPE tag_type AS ENUM ('boolean', 'categorical');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type tag_type NOT NULL,
    possible_values TEXT[] DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create validation function
CREATE OR REPLACE FUNCTION validate_event_tag()
RETURNS TRIGGER AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
BEGIN
    SELECT type, possible_values INTO tag_type_val, possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    IF tag_type_val = 'boolean' THEN
        IF array_length(NEW.tag_values, 1) != 1 OR NEW.tag_values[1] NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag must have exactly one value: true or false';
        END IF;
    ELSIF tag_type_val = 'categorical' AND possible_values_arr IS NOT NULL THEN
        IF NOT (SELECT bool_and(val = ANY(possible_values_arr)) FROM unnest(NEW.tag_values) AS val) THEN
            RAISE EXCEPTION 'Categorical tag values must be from the possible values list';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create event_tags table if events table exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        CREATE TABLE IF NOT EXISTS event_tags (
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
            tag_values TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (event_id, tag_id)
        );

        -- Create triggers
        DROP TRIGGER IF EXISTS update_event_tags_updated_at ON event_tags;
        CREATE TRIGGER update_event_tags_updated_at
            BEFORE UPDATE ON event_tags
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS validate_event_tag ON event_tags;
        CREATE TRIGGER validate_event_tag
            BEFORE INSERT OR UPDATE ON event_tags
            FOR EACH ROW
            EXECUTE FUNCTION validate_event_tag();
    END IF;
END $$;

-- Create update timestamp trigger for tags table
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes if table and column exist
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables t 
        JOIN information_schema.columns c ON c.table_name = t.table_name 
        WHERE t.table_name = 'event_tags' 
        AND c.column_name = 'tag_values'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_event_tags_tag_id ON event_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_event_tags_values ON event_tags USING gin (tag_values array_ops);
    END IF;
END $$;

COMMIT;
