import { db } from '../db';

async function getTags() {
    try {
        console.log('Fetching tags and their subcategories...\n');
        // First check table structure
        console.log('Checking tags table structure...');
        const tableInfo = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tags'
        `);
        
        console.log('\nTable structure:');
        tableInfo.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });

        // Then get all tags
        console.log('\nFetching tags...');
        const result = await db.query(`
            SELECT id, name, subcategories, possible_values
            FROM tags
            WHERE is_active = true
            ORDER BY name
        `);
        
        console.log('\nFound tags:');
        result.rows.forEach(row => {
            console.log(`${row.name}: ${row.id}`);
            console.log(`  Subcategories: ${row.subcategories}`);
            console.log(`  Possible values: ${row.possible_values}\n`);
        });

        console.log('\nTotal tags found:', result.rows.length);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

getTags();
