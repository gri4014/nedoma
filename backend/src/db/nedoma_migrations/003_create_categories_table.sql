DO $$
BEGIN
    -- Only create table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
        CREATE TABLE categories (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            parent_id UUID REFERENCES categories(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create index
        CREATE INDEX idx_categories_parent_id ON categories(parent_id);

        -- Create trigger
        CREATE TRIGGER update_categories_updated_at
            BEFORE UPDATE ON categories
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Insert initial categories only if table was just created
        INSERT INTO categories (id, name) VALUES
            ('d290f1ee-6c54-4b01-90e6-d701748f0851', 'Спорт'),
            ('d290f1ee-6c54-4b01-90e6-d701748f0852', 'Культура'),
            ('d290f1ee-6c54-4b01-90e6-d701748f0853', 'Развлечения');

        INSERT INTO categories (name, parent_id) VALUES
            ('Футбол', 'd290f1ee-6c54-4b01-90e6-d701748f0851'),
            ('Теннис', 'd290f1ee-6c54-4b01-90e6-d701748f0851'),
            ('Бои', 'd290f1ee-6c54-4b01-90e6-d701748f0851'),
            ('Хоккей', 'd290f1ee-6c54-4b01-90e6-d701748f0851');

        INSERT INTO categories (name, parent_id) VALUES
            ('Театры', 'd290f1ee-6c54-4b01-90e6-d701748f0852'),
            ('Кино', 'd290f1ee-6c54-4b01-90e6-d701748f0852'),
            ('Концерты', 'd290f1ee-6c54-4b01-90e6-d701748f0852'),
            ('Стендапы', 'd290f1ee-6c54-4b01-90e6-d701748f0852');

        INSERT INTO categories (name, parent_id) VALUES
            ('Рестораны, кафе', 'd290f1ee-6c54-4b01-90e6-d701748f0853'),
            ('Клубы, бары, рюмочные', 'd290f1ee-6c54-4b01-90e6-d701748f0853'),
            ('Игровой досуг', 'd290f1ee-6c54-4b01-90e6-d701748f0853');
    END IF;
END $$;
