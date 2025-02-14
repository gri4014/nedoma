const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

async function testConnection() {
  const client = await pool.connect();
  try {
    console.log('Connected to database successfully');
    
    // Simple query to check tag types
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'tags'
      ) as has_tags_table;
    `);
    
    console.log('\nDatabase check:', result.rows[0]);
    
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection().catch(console.error);
