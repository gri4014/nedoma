const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nedoma',
  user: process.env.DB_USER || 'grigorii',
  password: process.env.DB_PASSWORD,
});

async function updatePassword() {
  const client = await pool.connect();
  try {
    // Get current password hash
    const currentResult = await client.query(
      'SELECT password_hash FROM admins WHERE login = $1',
      ['admin']
    );
    console.log('Current password hash:', currentResult.rows[0]?.password_hash);

    // Generate and verify new hash
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('New generated hash:', passwordHash);

    // Test password validation
    const isValid = await bcrypt.compare(password, passwordHash);
    console.log('Password validation test:', isValid);

    // Update admin password
    const result = await client.query(
      'UPDATE admins SET password_hash = $1 WHERE login = $2 RETURNING id, login',
      [passwordHash, 'admin']
    );

    console.log('Admin updated:', result.rows[0]);
    console.log('New password:', password);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

updatePassword();
