BEGIN;

-- Create user tag preferences table
CREATE TABLE IF NOT EXISTS user_tag_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    selected_values TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tag_id)
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_tag_preferences_updated_at ON user_tag_preferences;
CREATE TRIGGER update_user_tag_preferences_updated_at
    BEFORE UPDATE ON user_tag_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
