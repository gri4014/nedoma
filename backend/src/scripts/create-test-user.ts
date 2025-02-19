import { db } from '../db';

async function createTestUser() {
    try {
        const testTelegramId = '123456789';
        
        console.log('Creating test user...');
        const userResult = await db.query(`
            INSERT INTO users (telegram_id)
            VALUES ($1)
            RETURNING *
        `, [testTelegramId]);

        console.log('\nCreated user:', userResult.rows[0]);
        const userId = userResult.rows[0].id;

        // Create some test category preferences
        console.log('\nCreating test preferences...');
        const prefsResult = await db.query(`
            INSERT INTO user_category_preferences 
            (user_id, subcategory_id, preference_level)
            VALUES 
            ($1, '123e4567-e89b-12d3-a456-426614174000', 1),
            ($1, '123e4567-e89b-12d3-a456-426614174001', 2)
            RETURNING *
        `, [userId]);

        console.log('\nCreated preferences:', prefsResult.rows);

        // Verify the data
        console.log('\nVerifying user preferences...');
        const verifyResult = await db.query('SELECT * FROM user_category_preferences WHERE user_id = $1', [userId]);
        console.log('Retrieved preferences:', verifyResult.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

createTestUser();
