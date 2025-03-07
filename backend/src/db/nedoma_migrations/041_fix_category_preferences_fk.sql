-- Drop the existing foreign key constraint
ALTER TABLE user_category_preferences
DROP CONSTRAINT IF EXISTS user_category_preferences_subcategory_id_fkey;

-- Add new foreign key constraint referencing categories table
ALTER TABLE user_category_preferences
ADD CONSTRAINT user_category_preferences_subcategory_id_fkey
FOREIGN KEY (subcategory_id)
REFERENCES categories(id)
ON DELETE CASCADE;

-- Create function to validate subcategory reference
CREATE OR REPLACE FUNCTION validate_subcategory_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM categories
        WHERE id = NEW.subcategory_id AND parent_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory: must reference a category with a parent';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure we only reference subcategories
DROP TRIGGER IF EXISTS ensure_subcategory_reference ON user_category_preferences;
CREATE TRIGGER ensure_subcategory_reference
    BEFORE INSERT OR UPDATE ON user_category_preferences
    FOR EACH ROW
    EXECUTE FUNCTION validate_subcategory_reference();
