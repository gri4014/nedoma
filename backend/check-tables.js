const { db } = require('./src/db');

async function checkTables() {
  try {
    // Check table structure
    console.log('\nChecking user_tag_preferences table structure...');
    const tableResult = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'user_tag_preferences'
      ORDER BY ordinal_position;
    `);
    
    if (tableResult.rows.length === 0) {
      console.log('Table user_tag_preferences does not exist');
    } else {
      console.log('Table structure:');
      tableResult.rows.forEach(col => {
        console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
      });
    }

    // Check if there are any records
    const countResult = await db.query(`
      SELECT COUNT(*) as count
      FROM user_tag_preferences;
    `);
    
    console.log(`\nTotal records: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await db.end();
  }
}

checkTables().catch(console.error);
