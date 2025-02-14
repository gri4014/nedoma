BEGIN;

-- Drop tags_categories table first if it exists (to avoid foreign key constraints)
DROP TABLE IF EXISTS tags_categories;

-- Drop tags table and recreate it with all required columns
DROP TABLE IF EXISTS tags CASCADE;

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    possible_values TEXT[] DEFAULT '{}'::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tags_categories junction table
CREATE TABLE IF NOT EXISTS tags_categories (
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tag_id, category_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_categories_tag_id ON tags_categories(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_categories_category_id ON tags_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags(is_active);

-- Create update timestamp triggers
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_categories_updated_at ON tags_categories;
CREATE TRIGGER update_tags_categories_updated_at
    BEFORE UPDATE ON tags_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
