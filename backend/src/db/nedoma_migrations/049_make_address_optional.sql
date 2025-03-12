-- Make address column nullable in events table
ALTER TABLE events ALTER COLUMN address DROP NOT NULL;
