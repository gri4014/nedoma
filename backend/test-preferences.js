const axios = require('axios');

const API_URL = 'http://localhost:3002/api'; // Updated port to match backend

async function testUserSystem() {
  try {
    // Create a user
    console.log('Creating user...');
    const createResponse = await axios.post(`${API_URL}/user`, {
      telegram_id: '123456789'
    });
    console.log('User created:', createResponse.data);

    // Save token for next requests
    const token = createResponse.data.token;

    // Set preferences
    console.log('\nSetting preferences...');
    const preferences = [
      { subcategoryId: 'd1d7953c-990f-472a-9c00-50949b8e964a', level: 1 },
      { subcategoryId: 'ec46f867-8e47-41b8-9139-cb8b57997b46', level: 2 }
    ];

    const preferencesResponse = await axios.post(
      `${API_URL}/user/preferences/categories`,
      { preferences },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Preferences set:', preferencesResponse.data);

    // Get preferences
    console.log('\nGetting preferences...');
    const getPreferencesResponse = await axios.get(
      `${API_URL}/user/preferences/categories`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Retrieved preferences:', getPreferencesResponse.data);

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\nError: Could not connect to server. Make sure the server is running on port 3002.');
      console.error('\nTo start the server:\n1. Open a new terminal\n2. Navigate to backend directory\n3. Run: npm run dev');
      return;
    }
    
    console.error('Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

console.log('Testing user system...');
console.log('Server URL:', API_URL);
console.log('Make sure the server is running before proceeding.\n');

testUserSystem();
