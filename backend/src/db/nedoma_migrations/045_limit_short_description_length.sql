-- Migration to limit short_description length to 160 characters
-- This ensures the database constraint matches the application validation

-- Add a check constraint to the events table for short_description
ALTER TABLE events
ADD CONSTRAINT short_description_length_check CHECK (length(short_description) <= 160);

-- Truncate any existing descriptions that are too long
UPDATE events
SET short_description = substring(short_description, 1, 160)
WHERE length(short_description) > 160;
