import { db } from '../db';

async function checkUsers() {
    try {
        console.log('\nChecking users table...');
        const usersResult = await db.query('SELECT * FROM users');
        console.log('Number of users:', usersResult.rows.length);
        
        if (usersResult.rows.length > 0) {
            console.log('\nSample user:');
            const sampleUser = usersResult.rows[0];
            console.log('ID type:', typeof sampleUser.id);
            console.log('ID value:', sampleUser.id);
            console.log('Telegram ID:', sampleUser.telegram_id);
            
            // Try to fetch preferences for this user
            const prefsResult = await db.query('SELECT * FROM user_category_preferences WHERE user_id = $1', [sampleUser.id]);
            console.log('\nPreferences for this user:', prefsResult.rows.length);
            console.log('Sample preference if exists:', prefsResult.rows[0]);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

checkUsers();
