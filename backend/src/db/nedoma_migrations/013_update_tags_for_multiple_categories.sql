-- Drop the old category_id column
ALTER TABLE tags DROP COLUMN IF EXISTS category_id;
