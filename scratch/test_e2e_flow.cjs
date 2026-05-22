const path = require('path');
const serverDir = 'c:/Users/prudh/OneDrive/Desktop/Goalmate/server';
const jwt = require(path.join(serverDir, 'node_modules/jsonwebtoken'));

const JWT_SECRET = 'goalmate-super-secret-key-12345!';

// Helper to sign JWT tokens
function generateToken(userId, username, email) {
  return jwt.sign({ id: userId, username, email }, JWT_SECRET, { expiresIn: '30d' });
}

async function runTest() {
  console.log("=============================================");
  console.log("   GOALMATE E2E API FLOW TEST                ");
  console.log("=============================================");

  const prudhviId = 'c9541e98-21b7-4657-9a49-6ad8ec89891b';
  const prudhviToken = generateToken(prudhviId, 'prudhvi', 'prudhvi@gmail.com');

  const navyaId = 'd7ebfd19-5a1d-4eff-8459-9cd23ce555de';
  const navyaToken = generateToken(navyaId, 'navya_03', 'navya@gmail.com');

  const headersPrudhvi = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${prudhviToken}`
  };

  const headersNavya = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${navyaToken}`
  };

  // 1. Prudhvi assigns a shared task to Navya
  console.log("\n[Step 1] Prudhvi sharing a task 'E2E Shared Task' with Navya...");
  const assignRes = await fetch('http://localhost:5000/api/tasks/assign', {
    method: 'POST',
    headers: headersPrudhvi,
    body: JSON.stringify({
      friendId: navyaId,
      title: "E2E Shared Task",
      description: "This is an E2E testing task",
      date: new Date().toISOString().split('T')[0],
      startTime: "10:00",
      endTime: "11:00",
      duration: "1",
      priority: "High",
      category: "Coding",
      assignBoth: true
    })
  });

  if (!assignRes.ok) {
    throw new Error(`Failed to assign task: ${await assignRes.text()}`);
  }

  const assignData = await assignRes.json();
  console.log("Assign Task Response:", JSON.stringify(assignData, null, 2));

  // 2. Fetch both users' tasks to find the task IDs
  console.log("\n[Step 2] Fetching tasks for both users to locate the E2E tasks...");
  
  const getTasksPrudhvi = await fetch('http://localhost:5000/api/tasks', { headers: headersPrudhvi });
  const tasksPrudhvi = await getTasksPrudhvi.json();
  const prudhviTask = tasksPrudhvi.find(t => t.title === 'E2E Shared Task');

  const getTasksNavya = await fetch('http://localhost:5000/api/tasks', { headers: headersNavya });
  const tasksNavya = await getTasksNavya.json();
  const navyaTask = tasksNavya.find(t => t.title === 'E2E Shared Task');

  if (!prudhviTask || !navyaTask) {
    throw new Error("Could not find the created E2E Shared Task in one or both users' task lists!");
  }

  console.log(`Prudhvi's Task ID: ${prudhviTask.id} (Completed: ${prudhviTask.completed}, AcceptanceStatus: ${prudhviTask.acceptanceStatus})`);
  console.log(`Navya's Task ID: ${navyaTask.id} (Completed: ${navyaTask.completed}, AcceptanceStatus: ${navyaTask.acceptanceStatus})`);

  // 3. Navya accepts the task invitation (acceptanceStatus goes pending -> accepted)
  console.log("\n[Step 3] Navya accepting the task invitation...");
  const acceptRes = await fetch(`http://localhost:5000/api/tasks/${navyaTask.id}/accept`, {
    method: 'POST',
    headers: headersNavya
  });

  if (!acceptRes.ok) {
    throw new Error(`Failed to accept task: ${await acceptRes.text()}`);
  }
  const acceptData = await acceptRes.json();
  console.log("Accept Task Response:", JSON.stringify(acceptData, null, 2));

  // 4. Prudhvi completes his task
  console.log("\n[Step 4] Prudhvi completing his task...");
  const completeRes = await fetch(`http://localhost:5000/api/tasks/${prudhviTask.id}`, {
    method: 'PUT',
    headers: headersPrudhvi,
    body: JSON.stringify({ completed: true })
  });

  if (!completeRes.ok) {
    throw new Error(`Failed to complete task: ${await completeRes.text()}`);
  }
  const completeData = await completeRes.json();
  console.log("Complete Task Response (Prudhvi):", JSON.stringify(completeData, null, 2));

  // 5. Fetch and verify Navya's task state
  console.log("\n[Step 5] Verifying Navya's task state to ensure decoupling & winner tracking...");
  const getTasksNavyaFinal = await fetch('http://localhost:5000/api/tasks', { headers: headersNavya });
  const tasksNavyaFinal = await getTasksNavyaFinal.json();
  const navyaTaskFinal = tasksNavyaFinal.find(t => t.id === navyaTask.id);

  console.log("Final Navya's Task State:", JSON.stringify(navyaTaskFinal, null, 2));

  // Verification Assertions
  const isDecoupled = (navyaTaskFinal.completed === false);
  const correctWinner = (navyaTaskFinal.completedBy === 'prudhvi');
  const isPending = (navyaTaskFinal.status === 'pending');

  console.log("\n=============================================");
  console.log("   VERIFICATION RESULTS                      ");
  console.log("=============================================");
  console.log(`- Decoupled Completion State: ${isDecoupled ? 'PASSED ✅ (Navya task remains incomplete)' : 'FAILED ❌'}`);
  console.log(`- Correct Winner Listed ('prudhvi'): ${correctWinner ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`- Navya Task Status is 'pending': ${isPending ? 'PASSED ✅' : 'FAILED ❌'}`);

  // 6. Clean up: Delete tasks
  console.log("\n[Step 6] Cleaning up test tasks from database...");
  await fetch(`http://localhost:5000/api/tasks/${prudhviTask.id}`, { method: 'DELETE', headers: headersPrudhvi });
  // Note: Deleting one side deletes the partner's task in routes.js when sharedTaskId exists.
  
  if (isDecoupled && correctWinner && isPending) {
    console.log("\n>>> ALL E2E API VERIFICATIONS PASSED SUCCESSFULLY! <<<\n");
  } else {
    console.error("\n>>> SOME VERIFICATIONS FAILED! <<<\n");
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
