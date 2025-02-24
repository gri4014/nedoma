BEGIN;

-- Rename preference_level column to level
ALTER TABLE user_category_preferences 
RENAME COLUMN preference_level TO level;

COMMIT;
