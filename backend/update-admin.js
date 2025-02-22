const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nedoma_copy',
  user: process.env.POSTGRES_USER || 'grigorii',
  password: process.env.POSTGRES_PASSWORD,
});

const updateAdmin = async () => {
  const client = await pool.connect();
  try {
    // Get password from command line arguments
    const password = process.argv[2] || 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Update admin password
    const result = await client.query(
      'UPDATE admins SET password_hash = $1 WHERE login = $2 RETURNING id, login',
      [passwordHash, 'admin']
    );

    if (result.rowCount === 0) {
      console.log('Admin user not found');
      return;
    }

    console.log('Admin password updated successfully');
    console.log('Admin:', result.rows[0]);
    console.log('New password:', password);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
};

updateAdmin().catch(console.error);
