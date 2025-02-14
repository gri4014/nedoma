const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nedoma',
  user: process.env.POSTGRES_USER || 'grigorii',
  password: process.env.POSTGRES_PASSWORD,
});

const checkAdmin = async () => {
  const client = await pool.connect();
  try {
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admins'
      );
    `);
    console.log('Admins table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Check table structure
      const tableStructure = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'admins'
        ORDER BY ordinal_position;
      `);
      console.log('\nTable structure:');
      console.table(tableStructure.rows);

      // Check admin records
      const admins = await client.query('SELECT id, login, is_active, role FROM admins;');
      console.log('\nAdmin records:');
      console.table(admins.rows);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
};

checkAdmin().catch(console.error);
