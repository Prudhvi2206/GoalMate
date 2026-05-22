const jwt = require('jsonwebtoken');
const db = require('./db');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'goalmate-super-secret-key-12345!';
const MONGODB_URI = 'mongodb://127.0.0.1:27017/goalmate';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const prudhvi = await db.getUserByUsername('prudhvi_22');
  
  if (!prudhvi) {
    console.error('prudhvi_22 not found');
    await mongoose.disconnect();
    return;
  }

  const token = jwt.sign(
    { id: prudhvi.id, username: prudhvi.username, email: prudhvi.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  console.log('Token generated successfully.');

  const res = await fetch('http://localhost:5000/api/journals', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response journals payload:', JSON.stringify(data, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
