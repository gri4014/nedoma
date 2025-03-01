BEGIN;

-- Temporarily drop constraints from dependent tables
ALTER TABLE user_category_preferences DROP CONSTRAINT IF EXISTS user_category_preferences_user_id_fkey;
ALTER TABLE user_tag_preferences DROP CONSTRAINT IF EXISTS user_tag_preferences_user_id_fkey;
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_user_id_fkey;

-- Create a temporary table with the new structure
CREATE TABLE users_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table to new table
INSERT INTO users_new (telegram_id, created_at, updated_at)
SELECT telegram_id, created_at, updated_at FROM users;

-- Drop old table and rename new one
DROP TABLE users CASCADE;
ALTER TABLE users_new RENAME TO users;

-- Recreate foreign key constraints with UUID type
ALTER TABLE user_category_preferences
ADD CONSTRAINT user_category_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_tag_preferences
ADD CONSTRAINT user_tag_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE swipes
ADD CONSTRAINT swipes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add index on telegram_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

COMMIT;
