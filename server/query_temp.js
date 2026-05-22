const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/goalmate';

async function main() {
  await mongoose.connect(MONGODB_URI);

  // Require schemas/models
  require('./db');

  const applications = await mongoose.model('Application').find({}).lean();
  console.log('--- APPLICATIONS ---');
  console.log(JSON.stringify(applications, null, 2));

  const tasks = await mongoose.model('Task').find({}).lean();
  console.log('--- TASKS ---');
  console.log(JSON.stringify(tasks, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
