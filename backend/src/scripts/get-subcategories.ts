import { db } from '../db';

async function getSubcategories() {
    try {
        console.log('Fetching subcategories...');
        const result = await db.query(`
            SELECT id, name, parent_id, is_subcategory 
            FROM categories 
            WHERE is_subcategory = true
            LIMIT 5
        `);
        
        console.log('\nFound subcategories:');
        result.rows.forEach(row => {
            console.log(`${row.name}: ${row.id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

getSubcategories();
