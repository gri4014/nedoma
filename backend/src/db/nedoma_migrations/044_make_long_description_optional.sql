-- Migration to make long_description optional
-- This allows the frontend to not require the long_description field

-- Update the events table to allow null values for long_description
ALTER TABLE events
ALTER COLUMN long_description DROP NOT NULL;

-- Set default value for long_description to be the same as short_description
-- for existing records where long_description is null
UPDATE events
SET long_description = short_description
WHERE long_description IS NULL;
