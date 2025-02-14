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

    -- Simple sequential ordering using a subquery
    UPDATE categories c
    SET display_order = s.order_num
    FROM (
        SELECT id, (GENERATE_SERIES(1, (SELECT COUNT(*) FROM categories)) * 10) AS order_num
        FROM categories
        ORDER BY name
    ) s
    WHERE c.id = s.id;
END $$;
