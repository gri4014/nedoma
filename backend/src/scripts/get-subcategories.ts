import { db } from '../db';

async function getSubcategories() {
    try {
        console.log('Fetching subcategories...');
        const result = await db.query(`
            SELECT s.id, s.name, c.name as category_name
            FROM subcategories s
            JOIN categories c ON s.category_id = c.id
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
