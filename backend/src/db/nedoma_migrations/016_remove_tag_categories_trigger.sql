BEGIN;

-- Drop existing constraints and triggers
DROP TRIGGER IF EXISTS check_tag_categories_trigger ON tags;
DROP FUNCTION IF EXISTS check_tag_categories CASCADE;

COMMIT;
