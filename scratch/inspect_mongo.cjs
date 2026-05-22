const mongoose = require('mongoose');

async function main() {
  const uri = 'mongodb://127.0.0.1:27017/goalmate';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const Friendship = mongoose.model('Friendship', new mongoose.Schema({}, { strict: false, collection: 'friendships' }));
  const Journal = mongoose.model('Journal', new mongoose.Schema({}, { strict: false, collection: 'journals' }));
  const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false, collection: 'applications' }));

  const users = await User.find().lean();
  console.log('\n--- USERS ---');
  console.log(users.map(u => ({ id: u.id, username: u.username, code: u.code })));

  const friendships = await Friendship.find().lean();
  console.log('\n--- FRIENDSHIPS ---');
  console.log(friendships);

  const journals = await Journal.find().lean();
  console.log('\n--- JOURNALS ---');
  console.log(journals.map(j => ({ id: j.id, userId: j.userId, title: j.title, shared: j.shared, content: j.content })));

  const apps = await Application.find().lean();
  console.log('\n--- APPLICATIONS ---');
  console.log(apps);

  await mongoose.disconnect();
}

main().catch(console.error);
