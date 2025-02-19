const axios = require('axios');

async function testCategories() {
  try {
    console.log('Fetching categories...');
    const response = await axios.get('http://localhost:3002/api/admin/categories');
    console.log('Categories response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\nError: Could not connect to server. Make sure the server is running on port 3002.');
      return;
    }
    console.error('Error:', error.response?.data || error.message);
  }
}

testCategories();
