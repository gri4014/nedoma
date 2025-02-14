-- Create initial admin user with password 'admin123'
INSERT INTO admins (id, login, password_hash, is_active, role)
VALUES (
  uuid_generate_v4(),
  'admin',
  '$2b$10$3IXhqHgGZnxTXgLJJcJ8L.Ld9Qz7gkO7OHvwxvhxvyWtGDGrwykPi', -- hashed 'admin123'
  true,
  'ADMIN'
)
ON CONFLICT (login) DO NOTHING;
