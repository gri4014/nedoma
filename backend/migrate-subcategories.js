const { Client } = require('pg');

const config = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nedoma',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

async function migrateSubcategories() {
  const client = new Client(config);
  await client.connect();

  try {
    console.log('Starting subcategories migration...');

    // Begin transaction
    await client.query('BEGIN');

    // Get all child categories
    const result = await client.query(`
      SELECT c.*, p.id as parent_id
      FROM categories c
      JOIN categories p ON c.parent_id = p.id
      WHERE c.parent_id IS NOT NULL AND c.is_active = true;
    `);

    if (result.rows.length === 0) {
      console.log('No subcategories found to migrate.');
      return;
    }

    console.log(`Found ${result.rows.length} subcategories to migrate.`);

    // Insert into subcategories table
    for (const row of result.rows) {
      await client.query(`
        INSERT INTO subcategories (
          id, name, category_id, display_order, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category_id = EXCLUDED.category_id,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active,
          updated_at = now();
      `, [
        row.id,
        row.name,
        row.parent_id,
        row.display_order || 0,
        row.is_active,
        row.created_at,
        row.updated_at
      ]);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully.');

    // Show current subcategories
    const finalResult = await client.query('SELECT * FROM subcategories ORDER BY display_order;');
    console.log('\nCurrent subcategories:', finalResult.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateSubcategories().catch(console.error);
