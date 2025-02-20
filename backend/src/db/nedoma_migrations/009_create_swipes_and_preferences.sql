BEGIN;

DO $$
BEGIN
    -- Create swipe_direction enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'swipe_direction') THEN
        CREATE TYPE swipe_direction AS ENUM ('left', 'right', 'up');
    END IF;
END $$;

-- Create tables in proper order
DO $$
BEGIN
    -- Create swipes table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'swipes') THEN
        CREATE TABLE swipes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            direction swipe_direction NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for swipes table
        CREATE INDEX idx_swipes_user_id ON swipes(user_id);
        CREATE INDEX idx_swipes_event_id ON swipes(event_id);
        CREATE INDEX idx_swipes_direction ON swipes(direction);

        -- Create trigger for swipes
        CREATE TRIGGER update_swipes_updated_at
            BEFORE UPDATE ON swipes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Create user_category_preferences table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_category_preferences') THEN
        CREATE TABLE user_category_preferences (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
            interest_level INTEGER CHECK (interest_level >= 0 AND interest_level <= 3),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, category_id)
        );

        -- Create indexes for user_category_preferences table
        CREATE INDEX idx_user_category_preferences_user_id ON user_category_preferences(user_id);
        CREATE INDEX idx_user_category_preferences_category_id ON user_category_preferences(category_id);

        -- Create trigger for user_category_preferences
        CREATE TRIGGER update_user_category_preferences_updated_at
            BEFORE UPDATE ON user_category_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Create user_tag_preferences table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_tag_preferences') THEN
        CREATE TABLE user_tag_preferences (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
            value TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, tag_id)
        );

        -- Create indexes for user_tag_preferences table
        CREATE INDEX idx_user_tag_preferences_user_id ON user_tag_preferences(user_id);
        CREATE INDEX idx_user_tag_preferences_tag_id ON user_tag_preferences(tag_id);

        -- Create trigger for user_tag_preferences
        CREATE TRIGGER update_user_tag_preferences_updated_at
            BEFORE UPDATE ON user_tag_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create the validation function for tag preferences
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

-- Drop and recreate the validation trigger
DROP TRIGGER IF EXISTS validate_user_tag_preference ON user_tag_preferences;
CREATE TRIGGER validate_user_tag_preference
    BEFORE INSERT OR UPDATE ON user_tag_preferences
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_tag_preference();

COMMIT;
