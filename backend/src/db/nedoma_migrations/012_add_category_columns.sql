DO $$
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'categories' AND column_name = 'is_active') THEN
        ALTER TABLE categories ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Add display_order column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'categories' AND column_name = 'display_order') THEN
        ALTER TABLE categories ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Update existing categories to have sequential display_order
    WITH RECURSIVE category_tree AS (
        -- Base case: root categories
        SELECT id, ROW_NUMBER() OVER (ORDER BY name) * 10 as new_order
        FROM categories
        WHERE parent_id IS NULL
        
        UNION ALL
        
        -- Recursive case: child categories
        SELECT c.id, ct.new_order + ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.name)
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
    )
    UPDATE categories c
    SET display_order = ct.new_order
    FROM category_tree ct
    WHERE c.id = ct.id;
END $$;
