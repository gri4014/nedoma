-- Drop the category requirement constraint
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tag_category_required;

-- Drop the tag_categories table
DROP TABLE IF EXISTS tag_categories;

-- Remove any category-related triggers
DROP TRIGGER IF EXISTS validate_tag_categories ON tags;
DROP FUNCTION IF EXISTS validate_tag_categories();

-- Update the tags table to remove category-related columns
ALTER TABLE tags DROP COLUMN IF EXISTS category_id;

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tags_timestamp ON tags;
CREATE TRIGGER update_tags_timestamp
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
