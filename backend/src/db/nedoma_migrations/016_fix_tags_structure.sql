BEGIN;

-- Add possible_values column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'possible_values'
    ) THEN
        ALTER TABLE tags ADD COLUMN possible_values TEXT[] DEFAULT '{}'::TEXT[];
    END IF;
END $$;

-- Create tags_categories junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS tags_categories (
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tag_id, category_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tags_categories_category_id ON tags_categories(category_id);

-- Create update timestamp trigger
DROP TRIGGER IF EXISTS update_tags_categories_updated_at ON tags_categories;
CREATE TRIGGER update_tags_categories_updated_at
    BEFORE UPDATE ON tags_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
