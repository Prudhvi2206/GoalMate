const mongoose = require('mongoose');
const db = require('./db');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/goalmate';

async function main() {
  await mongoose.connect(MONGODB_URI);

  const users = await mongoose.model('User').find({}).lean();
  console.log('--- USERS ---');
  users.forEach(u => console.log(`ID: ${u.id}, Username: ${u.username}, FriendCode: ${u.code}`));

  const friendships = await mongoose.model('Friendship').find({}).lean();
  console.log('--- FRIENDSHIPS ---');
  friendships.forEach(f => console.log(`ID: ${f.id}, User1: ${f.user1Id}, User2: ${f.user2Id}, Status: ${f.status}, Sender: ${f.senderId}`));

  const journals = await mongoose.model('Journal').find({}).lean();
  console.log('--- JOURNALS ---');
  journals.forEach(j => console.log(`ID: ${j.id}, User: ${j.userId}, Title: "${j.title}", Shared: ${j.shared}`));

  await mongoose.disconnect();
}

main().catch(console.error);
