const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Admin@123';
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Generated Hash:', hash);
  } catch (error) {
    console.error('Error:', error);
  }
}

generateHash();
