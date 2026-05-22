const mongoose = require('mongoose');
const db = require('./db');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/goalmate';

async function main() {
  await mongoose.connect(MONGODB_URI);

  const userId = 'bd39a9f2-49f3-4cfc-9912-b3c7c8535f6d'; // prudhvi_22
  const entries = await db.getJournalEntries(userId);
  console.log(`Found ${entries.length} entries:`);
  entries.forEach((e, idx) => {
    console.log(`Entry ${idx}: id=${e.id}, userId=${e.userId}, title=${e.title}, mood=${e.mood}, shared=${e.shared}, date=${e.date}, createdAt=${e.createdAt}, isSharedEntry=${e.isSharedEntry}, friendUsername=${e.friendUsername}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
