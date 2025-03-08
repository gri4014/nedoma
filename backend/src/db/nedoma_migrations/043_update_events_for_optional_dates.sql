-- Migration to update events table structure
-- 1. Remove relevance_start column
-- 2. Add display_dates boolean column with default true

ALTER TABLE events
DROP COLUMN relevance_start;

ALTER TABLE events
ADD COLUMN display_dates BOOLEAN NOT NULL DEFAULT TRUE;

-- No need to update schema version as it's handled by the migration script
