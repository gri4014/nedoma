BEGIN;

-- Drop existing table
DROP TABLE IF EXISTS user_category_preferences CASCADE;

-- Recreate table with correct column names and types
CREATE TABLE user_category_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subcategory_id)
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_category_preferences_updated_at ON user_category_preferences;
CREATE TRIGGER update_user_category_preferences_updated_at
    BEFORE UPDATE ON user_category_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
