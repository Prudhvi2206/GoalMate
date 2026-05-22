const path = require('path');
const serverDir = 'c:/Users/prudh/OneDrive/Desktop/Goalmate/server';
const sqlite3 = require(path.join(serverDir, 'node_modules/sqlite3'));
const { open } = require(path.join(serverDir, 'node_modules/sqlite'));

async function main() {
  const dbPath = path.join(serverDir, 'goalmate.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const users = await db.all("SELECT id, username, email FROM users");
  console.log("USERS:");
  console.log(JSON.stringify(users, null, 2));

  db.close();
}

main().catch(console.error);
