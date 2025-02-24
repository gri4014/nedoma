import { db } from '../db';

async function getSubcategories() {
    try {
        console.log('Fetching subcategories...\n');
        const result = await db.query(`
            SELECT c.name as category_name, s.id, s.name
            FROM subcategories s
            JOIN categories c ON s.category_id = c.id
            ORDER BY c.name, s.name
        `);
        
        let currentCategory = '';
        result.rows.forEach(row => {
            if (row.category_name !== currentCategory) {
                console.log(`\n${row.category_name}:`);
                currentCategory = row.category_name;
            }
            console.log(`  ${row.name}: ${row.id}`);
        });

        console.log('\nTotal subcategories found:', result.rows.length);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

getSubcategories();
