BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'swipe_direction') THEN
        CREATE TYPE swipe_direction AS ENUM ('left', 'right', 'up');
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    direction swipe_direction NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_category_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    interest_level INTEGER CHECK (interest_level >= 0 AND interest_level <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, category_id)
);
CREATE TABLE IF NOT EXISTS user_tag_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_event_id ON swipes(event_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON swipes(direction);
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id ON user_category_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_category_id ON user_category_preferences(category_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_user_id ON user_tag_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_tag_id ON user_tag_preferences(tag_id);
DROP TRIGGER IF EXISTS update_swipes_updated_at ON swipes;
CREATE TRIGGER update_swipes_updated_at
    BEFORE UPDATE ON swipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
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
CREATE OR REPLACE FUNCTION validate_user_tag_preference()
RETURNS TRIGGER AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
BEGIN
    SELECT type, possible_values INTO tag_type_val, possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    IF tag_type_val = 'boolean' THEN
        IF NEW.value NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag value must be either "true" or "false"';
        END IF;
    ELSIF tag_type_val = 'categorical' THEN
        IF NOT (NEW.value = ANY(possible_values_arr)) THEN
            RAISE EXCEPTION 'Categorical tag value must be one of the possible values';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS validate_user_tag_preference ON user_tag_preferences;
CREATE TRIGGER validate_user_tag_preference
    BEFORE INSERT OR UPDATE ON user_tag_preferences
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_tag_preference();
COMMIT;
