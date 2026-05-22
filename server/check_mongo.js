const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/goalmate';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log('\n--- USERS ---');
  users.forEach(u => console.log(`ID: ${u.id}, Username: ${u.username}, Code: ${u.code}`));

  const friendships = await db.collection('friendships').find({}).toArray();
  console.log('\n--- FRIENDSHIPS ---');
  friendships.forEach(f => console.log(`ID: ${f.id}, User1: ${f.user1Id}, User2: ${f.user2Id}, Status: ${f.status}, Sender: ${f.senderId}`));

  const journals = await db.collection('journals').find({}).toArray();
  console.log('\n--- JOURNALS ---');
  journals.forEach(j => console.log(`ID: ${j.id}, UserID: ${j.userId}, Title: "${j.title}", Content: "${j.content}", Shared: ${j.shared}`));

  await mongoose.disconnect();
}

main().catch(console.error);
