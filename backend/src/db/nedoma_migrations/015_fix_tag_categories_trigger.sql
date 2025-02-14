-- Drop existing constraints and triggers
DROP TRIGGER IF EXISTS check_tag_categories_trigger ON tags;
DROP FUNCTION IF EXISTS check_tag_categories CASCADE;

-- Create a constraint trigger function
CREATE OR REPLACE FUNCTION check_tag_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the tag has at least one category
    -- Add a small delay to allow the tag_categories to be inserted
    PERFORM pg_sleep(0.1);
    IF NOT EXISTS (
        SELECT 1 FROM tag_categories WHERE tag_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Tag must have at least one category';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a constraint trigger that fires at the end of transaction
CREATE CONSTRAINT TRIGGER check_tag_categories_trigger
AFTER INSERT OR UPDATE ON tags
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_tag_categories();

-- Set the trigger to be deferred by default in this transaction
SET CONSTRAINTS check_tag_categories_trigger DEFERRED;
