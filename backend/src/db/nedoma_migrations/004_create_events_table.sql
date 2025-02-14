BEGIN;

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    links TEXT[] DEFAULT ARRAY[]::TEXT[],
    relevance_start TIMESTAMP WITH TIME ZONE NOT NULL,
    event_dates TIMESTAMP WITH TIME ZONE[] NOT NULL,
    address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_free BOOLEAN NOT NULL DEFAULT false,
    price_range JSONB,
    category_id UUID,
    tags JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

COMMIT;
