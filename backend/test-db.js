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
    
    // Check tag types constraint
    const tagTypes = await client.query(`
      SELECT DISTINCT type 
      FROM tags 
      ORDER BY type
    `);
    console.log('\nTag types in use:', tagTypes.rows.map(r => r.type));

    // Check example tags by category
    const tagsByCategory = await client.query(`
      SELECT 
        c.name as category_name,
        json_agg(json_build_object(
          'name', t.name,
          'type', t.type,
          'possible_values', t.possible_values
        )) as tags
      FROM categories c
      LEFT JOIN tags t ON t.category_id = c.id
      WHERE c.parent_id IS NULL
      GROUP BY c.name
      ORDER BY c.name
    `);
    console.log('\nTags by main category:');
    tagsByCategory.rows.forEach(row => {
      console.log(`\n${row.category_name}:`);
      if (row.tags[0] !== null) {
        row.tags.forEach(tag => {
          console.log(`- ${tag.name} (${tag.type})${tag.possible_values ? ' Values: ' + JSON.stringify(tag.possible_values) : ''}`);
        });
      } else {
        console.log('No tags');
      }
    });

    // Check tag constraints
    const constraints = await client.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid)
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'tags'
      AND nsp.nspname = 'public'
    `);
    console.log('\nTag table constraints:');
    constraints.rows.forEach(row => {
      console.log(`- ${row.conname}: ${row.pg_get_constraintdef}`);
    });

  } catch (err) {
    console.error('Database error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection().catch(console.error);
