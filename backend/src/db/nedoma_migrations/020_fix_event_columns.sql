BEGIN;

-- Step 1: Handle image_urls column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'images') THEN
        ALTER TABLE events RENAME COLUMN images TO image_urls;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'image_urls') THEN
        ALTER TABLE events ADD COLUMN image_urls TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Step 2: Handle relevance_start column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'relevant_from') THEN
        ALTER TABLE events RENAME COLUMN relevant_from TO relevance_start;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'relevance_start') THEN
        ALTER TABLE events ADD COLUMN relevance_start TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Step 3: Add price_range column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_range') THEN
        ALTER TABLE events ADD COLUMN price_range JSONB;
    END IF;
END $$;

-- Step 4: Update price_range data if old columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_range_min') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'price_range_max') THEN
        UPDATE events 
        SET price_range = jsonb_build_object(
            'min', COALESCE(price_range_min, 0),
            'max', COALESCE(price_range_max, 0)
        )
        WHERE price_range_min IS NOT NULL OR price_range_max IS NOT NULL;

        -- Drop old price range columns
        ALTER TABLE events DROP COLUMN IF EXISTS price_range_min;
        ALTER TABLE events DROP COLUMN IF EXISTS price_range_max;
    END IF;
END $$;

-- Step 5: Handle is_free column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_free') THEN
        ALTER TABLE events ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_paid') THEN
        -- Update is_free data
        UPDATE events SET is_free = NOT COALESCE(is_paid, false);
        -- Drop is_paid column
        ALTER TABLE events DROP COLUMN is_paid;
    END IF;
END $$;

COMMIT;
