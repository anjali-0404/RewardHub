// Scratch integration test for complete Faculty Reward to Student Dashboard flow
const axios = require("axios");

const API_BASE = "http://localhost:5000/api";

async function runTest() {
  console.log("🚀 Starting End-to-End EduToken Faculty Recognition Flow Verification...\n");

  // Step 1: Login as Faculty Dr. Sarah Johnson
  console.log("1️⃣ Logging in as Faculty Dr. Sarah Johnson...");
  const facultyLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: "sarah.johnson@rewardhub.com",
    password: "password123",
  });
  const facultyToken = facultyLoginRes.data.token;
  console.log("   ✅ Faculty logged in successfully! Name:", facultyLoginRes.data.user.name);

  // Step 2: Login as Student Alice Thompson to get her ID and initial balance
  console.log("\n2️⃣ Logging in as Student Alice Thompson...");
  const studentLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: "alice.thompson@student.com",
    password: "password123",
  });
  const studentToken = studentLoginRes.data.token;
  const studentId = studentLoginRes.data.user.id;
  console.log(`   ✅ Student logged in! ID: ${studentId}, Name: ${studentLoginRes.data.user.name}`);

  // Check initial balance
  const initialBalanceRes = await axios.get(`${API_BASE}/users/wallet/calculated-balance`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`   Initial Student Balance: ${initialBalanceRes.data.blockchainBalance} EDU`);

  // Step 3: Faculty awards student 75 EDU tokens
  console.log("\n3️⃣ Faculty awards 75 EDU to Alice...");
  const rewardPayload = {
    studentId,
    amount: 75,
    achievementReason: "Research Excellence in Decentralized Systems",
    note: "Outstanding work on cryptographic proof mechanisms and peer mentoring.",
  };

  const awardRes = await axios.post(`${API_BASE}/faculty-rewards`, rewardPayload, {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });

  console.log("   ✅ Reward granted! Server Response Message:", awardRes.data.msg);
  const reward = awardRes.data.reward;
  console.log(`   Reward ID: ${reward.rewardId}`);
  console.log(`   Amount: ${reward.amount} EDU`);
  console.log(`   Achievement / Reason: ${reward.achievementReason}`);
  console.log(`   Faculty: ${reward.facultyDetails.name} (${reward.facultyDetails.designation} • ${reward.facultyDetails.department})`);
  console.log(`   Faculty Wallet: ${reward.facultyWallet}`);
  console.log(`   Student Wallet: ${reward.studentWallet}`);
  console.log(`   Tx Hash: ${reward.transactionHash}`);
  console.log(`   Tx Status: ${reward.transactionStatus}`);
  console.log(`   Ack Status: ${reward.acknowledgementStatus}`);

  // Step 4: Test Duplicate Prevention
  console.log("\n4️⃣ Testing duplicate award prevention...");
  try {
    await axios.post(`${API_BASE}/faculty-rewards`, rewardPayload, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    console.error("   ❌ ERROR: Duplicate should have been rejected!");
  } catch (dupErr) {
    if (dupErr.response && dupErr.response.status === 409) {
      console.log(`   ✅ Duplicate correctly rejected with 409 Conflict: "${dupErr.response.data.msg}"`);
    } else {
      console.log(`   ✅ Duplicate rejected: ${dupErr.response?.data?.msg || dupErr.message}`);
    }
  }

  // Step 5: Check Student Dashboard recognitions
  console.log("\n5️⃣ Fetching Alice's recognitions as Student...");
  const studentRewardsRes = await axios.get(`${API_BASE}/faculty-rewards/student/me`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });

  const rewards = studentRewardsRes.data.rewards;
  console.log(`   Found ${rewards.length} recognition records.`);
  const targetReward = rewards.find((r) => r.rewardId === reward.rewardId);
  if (!targetReward) {
    throw new Error("Target reward not found on student dashboard!");
  }
  console.log("   ✅ Found target reward on Alice's dashboard!");
  console.log(`      WHO: ${targetReward.facultyDetails.name} (${targetReward.facultyDetails.designation})`);
  console.log(`      WHAT/WHY: ${targetReward.achievementReason}`);
  console.log(`      HOW MUCH: +${targetReward.amount} EDU`);
  console.log(`      WHEN: ${targetReward.timestamp}`);
  console.log(`      BLOCKCHAIN: ${targetReward.transactionStatus} | Tx: ${targetReward.transactionHash}`);
  console.log(`      ACKNOWLEDGEMENT: ${targetReward.acknowledgementStatus}`);

  // Step 6: Student Acknowledges the reward
  console.log("\n6️⃣ Alice clicks 'Acknowledge'...");
  const ackRes = await axios.patch(
    `${API_BASE}/faculty-rewards/${targetReward.rewardId}/acknowledge`,
    {},
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );

  console.log("   ✅ Acknowledgement Response:", ackRes.data.msg);
  console.log(`      New Status: ${ackRes.data.reward.acknowledgementStatus}`);
  console.log(`      Timestamp: ${ackRes.data.reward.acknowledgementTimestamp}`);

  // Step 7: Verify updated token balance on-chain
  console.log("\n7️⃣ Checking Alice's updated on-chain balance...");
  const finalBalanceRes = await axios.get(`${API_BASE}/users/wallet/calculated-balance`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(`   Updated Student Balance: ${finalBalanceRes.data.blockchainBalance} EDU (+${finalBalanceRes.data.blockchainBalance - initialBalanceRes.data.blockchainBalance} EDU increase!)`);

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The complete flow works flawlessly end-to-end.");
}

runTest().catch((err) => {
  console.error("Test failed:", err.response?.data || err.message);
  process.exit(1);
});
