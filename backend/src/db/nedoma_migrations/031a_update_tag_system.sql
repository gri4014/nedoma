BEGIN;

-- Drop the old tag_type enum since all tags will be categorical
DROP TYPE IF EXISTS tag_type CASCADE;

-- Update tags table to remove type column and ensure all tags are categorical
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'type') THEN
        ALTER TABLE tags DROP COLUMN type;
    END IF;
END $$;

ALTER TABLE tags 
  ALTER COLUMN possible_values SET NOT NULL,
  ALTER COLUMN possible_values SET DEFAULT '{}';

-- Update event_tags table to store multiple values
DO $$ 
BEGIN
    -- Add selected_values column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tags' AND column_name = 'selected_values') THEN
        ALTER TABLE event_tags ADD COLUMN selected_values TEXT[] NOT NULL DEFAULT '{}';
    END IF;

    -- Drop the primary key constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_tags_pkey') THEN
        ALTER TABLE event_tags DROP CONSTRAINT event_tags_pkey;
    END IF;

    -- Convert existing values if the value column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_tags' AND column_name = 'value') THEN
        -- For boolean tags, convert to array
        UPDATE event_tags 
        SET selected_values = ARRAY[value::text] 
        WHERE value IS NOT NULL AND selected_values = '{}';

        -- Drop the value column
        ALTER TABLE event_tags DROP COLUMN value;
    END IF;
END $$;

-- Add new primary key that allows multiple values per tag
ALTER TABLE event_tags 
  ADD PRIMARY KEY (event_id, tag_id);

-- Convert existing boolean tags to categorical
UPDATE tags 
SET possible_values = ARRAY['true', 'false']
WHERE possible_values IS NULL OR possible_values = '{}';

-- Create function to validate tag values
CREATE OR REPLACE FUNCTION validate_event_tag_values()
RETURNS TRIGGER AS $$
DECLARE
    valid_values TEXT[];
BEGIN
    -- Get possible values for the tag
    SELECT possible_values INTO valid_values
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are valid
    IF NOT (SELECT bool_and(val = ANY(valid_values)) 
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'All selected values must be from the tag''s possible values';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for validating tag values
DROP TRIGGER IF EXISTS validate_event_tag_values ON event_tags;
CREATE TRIGGER validate_event_tag_values
    BEFORE INSERT OR UPDATE ON event_tags
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_tag_values();

-- Drop any existing tag_subcategories table and its dependencies
DROP TABLE IF EXISTS tag_subcategories CASCADE;

-- Create tag_subcategories table after ensuring subcategories table exists
CREATE TABLE tag_subcategories (
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tag_id, subcategory_id)
);

-- Create index in the same transaction
CREATE INDEX idx_tag_subcategories_subcategory_id ON tag_subcategories(subcategory_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_tag_subcategories_updated_at ON tag_subcategories;
CREATE TRIGGER update_tag_subcategories_updated_at
    BEFORE UPDATE ON tag_subcategories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
