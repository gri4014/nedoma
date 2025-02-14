const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nedoma',
  user: process.env.POSTGRES_USER || 'grigorii',
  password: process.env.POSTGRES_PASSWORD,
});

const verifyPassword = async () => {
  const client = await pool.connect();
  try {
    // Get admin record
    const result = await client.query('SELECT password_hash FROM admins WHERE login = $1', ['admin']);
    
    if (result.rowCount === 0) {
      console.log('Admin user not found');
      return;
    }

    const storedHash = result.rows[0].password_hash;
    
    // Test password
    const testPassword = 'admin123';
    const isMatch = await bcrypt.compare(testPassword, storedHash);
    
    console.log('Stored hash:', storedHash);
    console.log('Test password matches:', isMatch);

    // Generate new hash for comparison
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('New hash for same password:', newHash);
    console.log('New hash matches stored hash:', await bcrypt.compare(testPassword, newHash));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
};

verifyPassword().catch(console.error);
