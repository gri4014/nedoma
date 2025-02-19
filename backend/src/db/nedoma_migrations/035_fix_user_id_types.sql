BEGIN;

-- First drop tables that reference users
DROP TABLE IF EXISTS user_tag_preferences CASCADE;
DROP TABLE IF EXISTS user_category_preferences CASCADE;

-- Recreate user_category_preferences with correct type
CREATE TABLE IF NOT EXISTS user_category_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    preference_level INTEGER NOT NULL CHECK (preference_level BETWEEN 0 AND 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subcategory_id)
);

-- Recreate user_tag_preferences with correct type
CREATE TABLE IF NOT EXISTS user_tag_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    selected_values TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tag_id)
);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_user_category_preferences_updated_at ON user_category_preferences;
CREATE TRIGGER update_user_category_preferences_updated_at
    BEFORE UPDATE ON user_category_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_tag_preferences_updated_at ON user_tag_preferences;
CREATE TRIGGER update_user_tag_preferences_updated_at
    BEFORE UPDATE ON user_tag_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id ON user_category_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_subcategory_id ON user_category_preferences(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_user_id ON user_tag_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_tag_id ON user_tag_preferences(tag_id);

COMMIT;
