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

  // 1. Clean up old test tasks
  await db.run("DELETE FROM tasks WHERE title = 'Test Shared Task'");

  // 2. Create shared tasks for prudhvi and navya_03
  const sharedTaskId = 'test-shared-uuid-' + Date.now();
  const prudhviId = 'c9541e98-21b7-4657-9a49-6ad8ec89891b';
  const navyaId = 'd7ebfd19-5a1d-4eff-8459-9cd23ce555de';

  const prudhviTaskId = 'task-prudhvi-' + Date.now();
  const navyaTaskId = 'task-navya-' + Date.now();

  await db.run(
    `INSERT INTO tasks (id, userId, title, description, date, priority, category, completed, checklist, notes, assignedTo, sharedTaskId, acceptanceStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [prudhviTaskId, prudhviId, 'Test Shared Task', 'Desc', '2026-05-23', 'Medium', 'General', 0, '[]', '', 'Both:navya_03', sharedTaskId, 'accepted']
  );

  await db.run(
    `INSERT INTO tasks (id, userId, title, description, date, priority, category, completed, checklist, notes, assignedTo, sharedTaskId, acceptanceStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [navyaTaskId, navyaId, 'Test Shared Task', 'Desc', '2026-05-23', 'Medium', 'General', 0, '[]', '', 'Both:prudhvi', sharedTaskId, 'accepted']
  );

  console.log("INITIAL TASKS STATE:");
  let rows = await db.all("SELECT id, userId, title, completed, completedBy, sharedTaskId FROM tasks WHERE title = 'Test Shared Task'");
  console.log(JSON.stringify(rows, null, 2));

  // 3. Simulate PUT request update on prudhvi's task to mark it completed
  const id = prudhviTaskId;
  const taskData = { completed: true };

  // Fetch the task as it would be fetched in the route
  const existing = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
  
  let partnerTask = null;
  let newCompletedBy = undefined;

  if (existing.sharedTaskId) {
    // getTaskBySharedTaskId (exclude prudhvi's task)
    partnerTask = await db.get('SELECT * FROM tasks WHERE sharedTaskId = ? AND id != ?', [existing.sharedTaskId, id]);
    if (partnerTask) {
      if (taskData.completed !== undefined) {
        if (taskData.completed) {
          const winner = existing.completedBy || partnerTask.completedBy;
          newCompletedBy = winner || 'prudhvi'; // mock req.user.username
        } else {
          if (partnerTask.completed) {
            newCompletedBy = 'navya_03';
          } else {
            newCompletedBy = null;
          }
        }
        taskData.completedBy = newCompletedBy;
      }
    }
  }

  // Update creator's task
  // Since updateTask is implemented in db.js, let's replicate fields UPDATE logic
  const fields = [];
  const params = [];
  if (taskData.completed !== undefined) {
    fields.push('completed = ?');
    params.push(taskData.completed ? 1 : 0);
  }
  if (taskData.completedBy !== undefined) {
    fields.push('completedBy = ?');
    params.push(taskData.completedBy);
  }
  if (fields.length > 0) {
    params.push(id);
    await db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  // Update partner's task
  if (partnerTask) {
    const syncData = {};
    if (newCompletedBy !== undefined) syncData.completedBy = newCompletedBy;

    const partnerFields = [];
    const partnerParams = [];
    if (syncData.completedBy !== undefined) {
      partnerFields.push('completedBy = ?');
      partnerParams.push(syncData.completedBy);
    }
    if (partnerFields.length > 0) {
      partnerParams.push(partnerTask.id);
      await db.run(`UPDATE tasks SET ${partnerFields.join(', ')} WHERE id = ?`, partnerParams);
    }
  }

  console.log("\nAFTER PRUDHVI MARKS COMPLETED:");
  rows = await db.all("SELECT id, userId, title, completed, completedBy, sharedTaskId FROM tasks WHERE title = 'Test Shared Task'");
  console.log(JSON.stringify(rows, null, 2));

  // Clean up
  await db.run("DELETE FROM tasks WHERE title = 'Test Shared Task'");
  db.close();
}

main().catch(console.error);
