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

async function checkTables() {
  const client = new Client(config);
  await client.connect();

  try {
    console.log('\nChecking user_category_preferences table structure...');
    const prefResult = await client.query(`
      SELECT 
        column_name, 
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_category_preferences';
    `);

    console.log('Table structure:');
    prefResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });

    const prefCount = await client.query('SELECT COUNT(*) FROM user_category_preferences;');
    console.log(`\nTotal records: ${prefCount.rows[0].count}`);

    console.log('\nChecking subcategories table structure...');
    const subResult = await client.query(`
      SELECT 
        column_name, 
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'subcategories';
    `);

    console.log('Table structure:');
    subResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });

    const subCount = await client.query('SELECT COUNT(*) FROM subcategories;');
    console.log(`\nTotal records: ${subCount.rows[0].count}`);

    // Check foreign key constraints
    const constraintResult = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_category_preferences';
    `);

    console.log('\nForeign key constraints:');
    constraintResult.rows.forEach(constraint => {
      console.log(`${constraint.constraint_name}: ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTables().catch(console.error);
