-- Skip adding is_active column since it's already added in migration 005
-- Just add default value for existing rows if needed
UPDATE tags SET is_active = true WHERE is_active IS NULL;
