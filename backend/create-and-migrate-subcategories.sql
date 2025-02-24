BEGIN;

-- Drop the existing subcategories table if it exists
DROP TABLE IF EXISTS subcategories CASCADE;

-- Create the subcategories table with all required columns
CREATE TABLE subcategories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert data from categories table
INSERT INTO subcategories (id, name, category_id, display_order, is_active, created_at, updated_at)
SELECT 
    c.id,
    c.name,
    c.parent_id,
    COALESCE(c.display_order, 0),
    c.is_active,
    c.created_at,
    c.updated_at
FROM categories c
WHERE c.parent_id IS NOT NULL;

-- Update foreign key in user_category_preferences to reference subcategories
ALTER TABLE user_category_preferences
    DROP CONSTRAINT IF EXISTS user_category_preferences_subcategory_id_fkey,
    ADD CONSTRAINT user_category_preferences_subcategory_id_fkey 
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id);

COMMIT;
