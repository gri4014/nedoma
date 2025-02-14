const axios = require('axios');

async function testLogin() {
  console.log('Starting login test...');
  console.log('Testing endpoint: http://localhost:3002/api/developer/auth/login');
  console.log('Credentials being tested:', {
    login: 'admin',
    password: 'Admin@123'
  });

  try {
    // Attempt login directly without health check
    console.log('\nAttempting login...');
    const response = await axios.post('http://localhost:3002/api/developer/auth/login', {
      login: 'admin',
      password: 'Admin@123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: false // Don't throw on non-2xx responses
    });

    // Log detailed response info
    console.log('\nResponse details:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log('\n✓ Login successful');
      console.log('JWT Token received:', response.data.token ? 'Yes' : 'No');
    } else {
      console.error('\n✗ Login failed');
      console.error('Status Code:', response.status);
      if (response.data && response.data.message) {
        console.error('Error Message:', response.data.message);
      }
      if (response.data && response.data.errors) {
        console.error('Validation Errors:', response.data.errors);
      }
    }

  } catch (error) {
    console.error('\n✗ Request failed:');
    if (error.response) {
      // Server responded with non-2xx status
      console.error('Server Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from server');
      console.error('Request details:', {
        method: error.request.method,
        path: error.request.path,
        headers: error.request.headers
      });
    } else {
      // Error in setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.config) {
      console.error('Request configuration:', {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers,
        data: error.config.data
      });
    }
  }
}

testLogin();
