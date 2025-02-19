const { db } = require('./src/db');

async function checkPreferences() {
  try {
    // Check tag preferences
    console.log('\nChecking user_tag_preferences table...');
    const tagPrefsResult = await db.query(`
      SELECT 
        t.name as tag_name,
        utp.selected_values,
        COUNT(*) as user_count
      FROM user_tag_preferences utp
      JOIN tags t ON t.id = utp.tag_id
      GROUP BY t.name, utp.selected_values
      ORDER BY t.name
    `);
    
    if (tagPrefsResult.rows.length === 0) {
      console.log('No tag preferences found in the database.');
    } else {
      console.log('Found tag preferences:');
      tagPrefsResult.rows.forEach(row => {
        console.log(`\nTag: ${row.tag_name}`);
        console.log(`Selected Values: ${JSON.stringify(row.selected_values)}`);
        console.log(`Number of users with this preference: ${row.user_count}`);
      });
    }

    // Check category preferences
    console.log('\nChecking user_category_preferences table...');
    const categoryPrefsResult = await db.query(`
      SELECT 
        c.name as category_name,
        ucp.preference_level,
        COUNT(*) as user_count
      FROM user_category_preferences ucp
      JOIN categories c ON c.id = ucp.subcategory_id
      GROUP BY c.name, ucp.preference_level
      ORDER BY c.name, ucp.preference_level
    `);

    if (categoryPrefsResult.rows.length === 0) {
      console.log('No category preferences found in the database.');
    } else {
      console.log('\nFound category preferences:');
      categoryPrefsResult.rows.forEach(row => {
        console.log(`\nCategory: ${row.category_name}`);
        console.log(`Preference Level: ${row.preference_level}`);
        console.log(`Number of users with this preference: ${row.user_count}`);
      });
    }

    // Check available tags and their possible values
    console.log('\nChecking available tags...');
    const tagsResult = await db.query(`
      SELECT 
        t.name,
        t.possible_values,
        t.is_active,
        array_agg(DISTINCT c.name) as subcategories
      FROM tags t
      LEFT JOIN tag_subcategories ts ON t.id = ts.tag_id
      LEFT JOIN categories c ON ts.subcategory_id = c.id
      GROUP BY t.id
      ORDER BY t.name
    `);
    
    if (tagsResult.rows.length === 0) {
      console.log('No tags found in the database.');
    } else {
      console.log('\nAvailable tags:');
      tagsResult.rows.forEach(row => {
        console.log(`\nTag: ${row.name} (${row.is_active ? 'active' : 'inactive'})`);
        console.log(`Possible Values: ${JSON.stringify(row.possible_values)}`);
        console.log(`Subcategories: ${row.subcategories.filter(s => s !== null).join(', ') || 'none'}`);
      });
    }

  } catch (error) {
    console.error('Error checking preferences:', error);
  } finally {
    await db.end();
  }
}

checkPreferences().catch(console.error);
