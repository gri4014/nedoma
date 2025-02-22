const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nedoma_copy',
  user: process.env.POSTGRES_USER || 'grigorii',
  password: process.env.POSTGRES_PASSWORD,
});

async function testLogin() {
  const client = await pool.connect();
  try {
    // Get current password hash
    const result = await client.query(
      'SELECT password_hash FROM admins WHERE login = $1',
      ['admin']
    );
    const storedHash = result.rows[0]?.password_hash;
    console.log('Stored hash:', storedHash);

    // Test password
    const password = 'Admin@123';
    console.log('Testing password:', password);

    // Test validation
    const isValid = await bcrypt.compare(password, storedHash);
    console.log('Password validation result:', isValid);

    // Generate a new hash for the same password
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash generated:', newHash);

    // Verify new hash
    const isValidNew = await bcrypt.compare(password, newHash);
    console.log('New hash validation:', isValidNew);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

testLogin();
