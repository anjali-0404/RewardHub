<template>
  <div class="dashboard-layout">
    <AppHeader />
    <div class="dashboard-content">
      <AppSidebar />
      <main class="main-content">
        <div class="page-header">
          <div class="header-content">
            <h1>Award Faculty Recognition</h1>
            <p class="header-subtitle">
              Recognize student achievements with verified on-chain EDU token rewards
            </p>
          </div>
        </div>

        <div class="award-container">
          <div class="award-card">
            <div class="card-header">
              <div class="icon-wrapper">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="trophy-icon"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
                  />
                </svg>
              </div>
              <div class="header-text">
                <h2>Recognition Details</h2>
                <p>Select student, enter EDU tokens, and provide recognition reason</p>
              </div>
            </div>

            <!-- Last Transaction Success Alert -->
            <div v-if="lastAwarded" class="last-reward-banner">
              <div class="banner-icon">✓</div>
              <div class="banner-body">
                <strong>Recognition Awarded Successfully!</strong>
                <p class="banner-meta">
                  Awarded <strong>{{ lastAwarded.amount }} EDU</strong> to
                  <strong>{{ lastAwarded.studentName }}</strong> for
                  <em>"{{ lastAwarded.reason }}"</em>
                </p>
                <div v-if="lastAwarded.txHash" class="banner-tx">
                  <span>Tx Hash: </span>
                  <code class="tx-code">{{ formatTx(lastAwarded.txHash) }}</code>
                </div>
              </div>
              <button @click="lastAwarded = null" class="btn-close-banner">✕</button>
            </div>

            <form @submit.prevent="handleAward" class="award-form">
              <div class="form-section">
                <!-- 1. Select Student -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Student Recipient <span class="required">*</span></span>
                    <span class="label-hint">Choose which student will receive this recognition</span>
                  </label>
                  <div class="select-wrapper">
                    <select
                      v-model="form.studentId"
                      class="form-select"
                      required
                      :disabled="loading"
                      @change="handleStudentChange"
                    >
                      <option value="">Choose a student...</option>
                      <option
                        v-for="student in students"
                        :key="student._id"
                        :value="student._id"
                      >
                        {{ student.name }} • {{ student.email }} {{ student.walletConnected ? '(✓ Wallet Connected)' : '(⚠️ No Wallet)' }}
                      </option>
                    </select>
                    <div class="select-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  <!-- Selected Student Wallet Status Banner -->
                  <div v-if="selectedStudent" class="student-status-box" :class="{ 'has-wallet': selectedStudent.walletConnected, 'no-wallet': !selectedStudent.walletConnected }">
                    <div v-if="selectedStudent.walletConnected" class="wallet-status-row">
                      <span class="status-dot green"></span>
                      <span>Verified Wallet: <code class="wallet-addr">{{ selectedStudent.walletAddress }}</code></span>
                    </div>
                    <div v-else class="wallet-status-row warning">
                      <span class="status-dot red"></span>
                      <span>Student has not connected a Web3 wallet. Tokens cannot be awarded until they connect.</span>
                    </div>
                  </div>
                </div>

                <!-- 2. EDU Amount -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">EDU Token Amount <span class="required">*</span></span>
                    <span class="label-hint">How many tokens to grant directly to their wallet</span>
                  </label>
                  <div class="amount-input-group">
                    <input
                      v-model.number="form.amount"
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 50"
                      class="form-input form-input-amount"
                      required
                      :disabled="loading"
                    />
                    <div class="amount-suffix">EDU Tokens</div>
                  </div>

                  <!-- Quick Amount Presets -->
                  <div class="presets-row">
                    <span class="presets-label">Quick select:</span>
                    <button
                      type="button"
                      v-for="preset in [10, 25, 50, 100, 200]"
                      :key="preset"
                      class="preset-chip"
                      :class="{ active: form.amount === preset }"
                      @click="form.amount = preset"
                    >
                      +{{ preset }}
                    </button>
                  </div>
                </div>

                <!-- 3. Achievement / Reason Selection -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Achievement / Reason <span class="required">*</span></span>
                    <span class="label-hint">What milestone, project, or performance are they being recognized for?</span>
                  </label>
                  <div class="select-wrapper">
                    <select
                      v-model="selectedAchievementOption"
                      class="form-select"
                      required
                      :disabled="loading"
                      @change="handleAchievementChange"
                    >
                      <option value="">Select achievement category / reason...</option>
                      <option
                        v-for="achievement in achievements"
                        :key="achievement._id"
                        :value="achievement._id"
                      >
                        {{ achievement.title }} (Recommended: {{ achievement.tokenReward }} EDU)
                      </option>
                      <option value="custom">✏️ Custom Reason / Special Recognition...</option>
                    </select>
                    <div class="select-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  <!-- Custom Reason Input (if chosen) -->
                  <div v-if="selectedAchievementOption === 'custom'" class="custom-reason-wrapper mt-2">
                    <input
                      v-model="customReason"
                      type="text"
                      placeholder="Enter custom recognition title (e.g. Exceptional Capstone Project Defense)"
                      class="form-input"
                      required
                      :disabled="loading"
                    />
                  </div>
                </div>

                <!-- 4. Optional Faculty Note -->
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Faculty Personal Note (Optional)</span>
                    <span class="label-hint">Add specific feedback, commendation, or encouragement for the student</span>
                  </label>
                  <textarea
                    v-model="form.note"
                    rows="3"
                    class="form-textarea"
                    placeholder="e.g. Demonstrating outstanding initiative in the smart contracts lab and peer-mentoring junior students."
                    :disabled="loading"
                  ></textarea>
                </div>
              </div>

              <!-- Form Footer -->
              <div class="form-footer">
                <div
                  class="info-banner"
                  v-if="form.studentId && isFormReady"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="info-icon"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <span>
                    Ready to award <strong>{{ form.amount }} EDU</strong>. This will execute a blockchain transaction and permanently link this recognition to the student's dashboard.
                  </span>
                </div>

                <button
                  type="submit"
                  class="btn btn-primary btn-award"
                  :disabled="loading || !isFormReady"
                >
                  <svg
                    v-if="!loading"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="btn-icon"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span v-if="loading" class="spinner-sm"></span>
                  <span>{{
                    loading ? "Executing Blockchain Transaction..." : `Award ${form.amount || 0} EDU Recognition`
                  }}</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Side Panel / Quick Guide -->
          <div class="info-panel">
            <div class="info-card">
              <div class="info-header">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="info-card-icon"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
                <h3>EduToken Flow</h3>
              </div>
              <ul class="tips-list">
                <li>
                  <span class="tip-bullet">1</span>
                  <span>Select student with a verified Web3 wallet</span>
                </li>
                <li>
                  <span class="tip-bullet">2</span>
                  <span>Specify EDU amount and recognition reason</span>
                </li>
                <li>
                  <span class="tip-bullet">3</span>
                  <span>Smart contract mints EDU tokens directly to recipient</span>
                </li>
                <li>
                  <span class="tip-bullet">4</span>
                  <span>Permanent record appears instantly on Student Dashboard</span>
                </li>
                <li>
                  <span class="tip-bullet">5</span>
                  <span>Student acknowledges receipt with cryptographic proof</span>
                </li>
              </ul>
            </div>

            <!-- Stats Mini -->
            <div class="stats-mini">
              <div class="stat-mini-item">
                <div class="stat-mini-label">Eligible Students</div>
                <div class="stat-mini-value">{{ connectedStudentsCount }} / {{ students.length }}</div>
              </div>
              <div class="stat-mini-item">
                <div class="stat-mini-label">Awarded by You</div>
                <div class="stat-mini-value">{{ recentRewards.length }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Recognitions Awarded by this Faculty Member -->
        <div class="recent-awarded-section mt-4">
          <div class="section-title-bar">
            <h2>Your Recently Awarded Recognitions</h2>
            <button @click="loadFacultyAwards" class="btn btn-secondary btn-xs">Refresh History</button>
          </div>

          <div v-if="loadingAwards" class="loading-state card">
            <LoadingSpinner />
            <p>Loading your award history...</p>
          </div>

          <div v-else-if="recentRewards.length === 0" class="empty-recent card">
            <p>You haven't awarded any recognitions yet. Use the form above to grant your first award.</p>
          </div>

          <div v-else class="recent-table-wrapper card">
            <table class="recent-table">
              <thead>
                <tr>
                  <th>Reward ID</th>
                  <th>Student</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Tx Hash</th>
                  <th>Blockchain</th>
                  <th>Student Ack</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in recentRewards" :key="r._id || r.rewardId">
                  <td class="monospace font-semibold">{{ r.rewardId }}</td>
                  <td>
                    <div class="student-cell">
                      <span class="student-name">{{ r.studentId?.name || "Student" }}</span>
                      <small class="text-tertiary monospace">{{ formatTx(r.studentWallet) }}</small>
                    </div>
                  </td>
                  <td>{{ r.achievementReason }}</td>
                  <td>
                    <span class="badge badge-primary">+{{ r.amount }} EDU</span>
                  </td>
                  <td>
                    <span v-if="r.transactionHash" class="monospace text-xs" :title="r.transactionHash">
                      {{ formatTx(r.transactionHash) }}
                    </span>
                    <span v-else class="text-secondary">—</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="r.transactionStatus === 'confirmed' ? 'badge-success' : (r.transactionStatus === 'failed' ? 'badge-danger' : 'badge-warning')"
                    >
                      {{ r.transactionStatus }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="r.acknowledgementStatus === 'acknowledged' ? 'badge-success' : 'badge-secondary'"
                    >
                      {{ r.acknowledgementStatus === 'acknowledged' ? '✓ Acknowledged' : 'Pending' }}
                    </span>
                  </td>
                  <td class="text-secondary text-xs">{{ formatDate(r.timestamp) }}</td>
                  <td>
                    <button
                      v-if="r.transactionStatus === 'failed'"
                      @click="handleRetry(r)"
                      class="btn btn-secondary btn-xs"
                      :disabled="retryingId === (r._id || r.rewardId)"
                    >
                      {{ retryingId === (r._id || r.rewardId) ? "Retrying..." : "Retry Tx" }}
                    </button>
                    <span v-else class="text-secondary">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import AppHeader from "@/components/common/AppHeader.vue";
import AppSidebar from "@/components/common/AppSidebar.vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import { getStudents } from "@/services/admin.service";
import { useAchievementsStore } from "@/stores/achievements";
import {
  createFacultyReward,
  getFacultyAwardedRewards,
  retryFacultyReward,
} from "@/services/facultyReward.service";
import { parseApiError } from "@/utils/errorParser";

const achievementsStore = useAchievementsStore();
const students = ref([]);
const achievements = ref([]);
const recentRewards = ref([]);
const loading = ref(false);
const loadingAwards = ref(false);
const lastAwarded = ref(null);
const retryingId = ref(null);

const selectedAchievementOption = ref("");
const customReason = ref("");

const form = ref({
  studentId: "",
  amount: 50,
  note: "",
});

const selectedStudent = computed(() => {
  return students.value.find((s) => s._id === form.value.studentId) || null;
});

const connectedStudentsCount = computed(() => {
  return students.value.filter((s) => s.walletConnected).length;
});

const isFormReady = computed(() => {
  if (!form.value.studentId) return false;
  if (!selectedStudent.value || !selectedStudent.value.walletConnected) return false;
  if (!Number.isInteger(form.value.amount) || form.value.amount <= 0) return false;
  if (!selectedAchievementOption.value) return false;
  if (selectedAchievementOption.value === "custom" && !customReason.value.trim()) return false;
  return true;
});

function handleStudentChange() {
  // Reset last award banner when user changes student
  lastAwarded.value = null;
}

function handleAchievementChange() {
  if (selectedAchievementOption.value && selectedAchievementOption.value !== "custom") {
    const found = achievements.value.find(
      (a) => a._id === selectedAchievementOption.value
    );
    if (found && found.tokenReward) {
      form.value.amount = found.tokenReward;
    }
  }
}

async function loadData() {
  try {
    const studentsData = await getStudents();
    students.value = studentsData.students || [];

    await achievementsStore.fetchPublicAchievements();
    achievements.value = achievementsStore.achievements || [];
  } catch (error) {
    console.error("Error loading data:", error);
    window.$toast?.(parseApiError(error), "error");
  }
}

async function loadFacultyAwards() {
  loadingAwards.value = true;
  try {
    const data = await getFacultyAwardedRewards({ limit: 10 });
    recentRewards.value = data.rewards || [];
  } catch (err) {
    console.error("Error fetching awarded history:", err);
  } finally {
    loadingAwards.value = false;
  }
}

async function handleAward() {
  if (!isFormReady.value) return;

  loading.value = true;
  try {
    let reason = "";
    let achId = null;

    if (selectedAchievementOption.value === "custom") {
      reason = customReason.value.trim();
    } else {
      const ach = achievements.value.find(
        (a) => a._id === selectedAchievementOption.value
      );
      reason = ach ? ach.title : "Academic Excellence";
      achId = ach?._id;
    }

    const payload = {
      studentId: form.value.studentId,
      amount: form.value.amount,
      achievementReason: reason,
      achievementId: achId,
      note: form.value.note ? form.value.note.trim() : "",
    };

    const res = await createFacultyReward(payload);

    window.$toast?.("Recognition awarded and verified on blockchain!", "success");

    lastAwarded.value = {
      amount: form.value.amount,
      studentName: selectedStudent.value?.name || "Student",
      reason,
      txHash: res.transactionHash || res.reward?.transactionHash,
    };

    // Reset form fields
    form.value.amount = 50;
    form.value.note = "";
    selectedAchievementOption.value = "";
    customReason.value = "";

    // Refresh history
    await loadFacultyAwards();
  } catch (error) {
    console.error("Error awarding achievement:", error);
    window.$toast?.(parseApiError(error), "error");
  } finally {
    loading.value = false;
  }
}

function formatTx(hash) {
  if (!hash) return "";
  if (hash.length < 12) return hash;
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
}

async function handleRetry(r) {
  const targetId = r.rewardId || r._id;
  retryingId.value = r._id || r.rewardId;
  try {
    const res = await retryFacultyReward(targetId);
    window.$toast?.(res.msg || "Transaction retried successfully!", "success");
    await loadFacultyAwards();
  } catch (error) {
    console.error("Error retrying reward:", error);
    window.$toast?.(parseApiError(error), "error");
    await loadFacultyAwards();
  } finally {
    retryingId.value = null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(() => {
  loadData();
  loadFacultyAwards();
});
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background: var(--bg-secondary);
}

.dashboard-content {
  display: flex;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content h1 {
  font-size: var(--font-size-3xl);
  margin-bottom: 0.5rem;
  background: linear-gradient(
    135deg,
    var(--primary-color) 0%,
    var(--accent-teal) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
}

.header-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  margin: 0;
}

.award-container {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 2rem;
  align-items: start;
}

.award-card {
  background: var(--bg-elevated);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    var(--primary-subtle) 0%,
    var(--accent-teal-subtle) 100%
  );
  border-bottom: 1px solid var(--border-color);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: linear-gradient(
    135deg,
    var(--primary-color) 0%,
    var(--accent-teal) 100%
  );
  border-radius: var(--border-radius-lg);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  flex-shrink: 0;
}

.trophy-icon {
  width: 28px;
  height: 28px;
  color: white;
  stroke-width: 2.5;
}

.header-text h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.header-text p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

/* Last Awarded Banner */
.last-reward-banner {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: var(--border-radius-md);
  margin: 1.5rem 2rem 0 2rem;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.banner-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #10b981;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.banner-body {
  flex: 1;
}

.banner-meta {
  font-size: var(--font-size-sm);
  margin: 0.25rem 0 0.5rem 0;
}

.banner-tx {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.tx-code {
  font-family: var(--font-family-mono);
  background: var(--bg-tertiary);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.btn-close-banner {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 1rem;
}

.award-form {
  padding: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.625rem;
}

.label-text {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.required {
  color: var(--danger-color);
}

.label-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.select-wrapper {
  position: relative;
}

.form-select,
.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: var(--font-size-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: all var(--transition-base);
  font-family: inherit;
}

.form-select {
  padding-right: 2.5rem;
  appearance: none;
  cursor: pointer;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-tertiary);
  width: 18px;
  height: 18px;
}

/* Student status box */
.student-status-box {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
}

.student-status-box.has-wallet {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10b981;
}

.student-status-box.no-wallet {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--danger-color);
}

.wallet-status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.green {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.status-dot.red {
  background: #ef4444;
}

.wallet-addr {
  font-family: var(--font-family-mono);
  font-weight: 600;
}

/* Amount Input Group */
.amount-input-group {
  display: flex;
  align-items: stretch;
}

.form-input-amount {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--primary-light);
}

.amount-suffix {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-left: none;
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  border-top-right-radius: var(--border-radius-md);
  border-bottom-right-radius: var(--border-radius-md);
}

.presets-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.presets-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.preset-chip {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 0.25rem 0.6rem;
  border-radius: var(--border-radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preset-chip:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.preset-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 2.5rem;
}

.form-footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(79, 70, 229, 0.08);
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: var(--border-radius-md);
  padding: 0.75rem 1rem;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.info-icon {
  width: 20px;
  height: 20px;
  color: var(--primary-light);
  flex-shrink: 0;
}

.btn-award {
  padding: 0.875rem 1.5rem;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--border-radius-md);
}

/* Side info panel */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  background: var(--bg-elevated);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-card-icon {
  width: 22px;
  height: 22px;
  color: var(--primary-light);
}

.info-header h3 {
  font-size: var(--font-size-base);
  margin: 0;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.tips-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.4;
}

.tip-bullet {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--primary-light);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.7rem;
}

.stats-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-mini-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: 1rem;
  text-align: center;
}

.stat-mini-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: 0.25rem;
}

.stat-mini-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

/* Recent Recognitions Table */
.recent-awarded-section {
  background: var(--bg-elevated);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
}

.section-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.section-title-bar h2 {
  font-size: var(--font-size-lg);
  margin: 0;
}

.btn-xs {
  padding: 0.25rem 0.6rem;
  font-size: var(--font-size-xs);
}

.recent-table-wrapper {
  overflow-x: auto;
  padding: 0;
}

.recent-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  text-align: left;
}

.recent-table th,
.recent-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.recent-table th {
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.recent-table tr:hover td {
  background: var(--bg-tertiary);
}

.student-cell {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: var(--font-weight-medium);
}

.empty-recent {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

@media (max-width: 900px) {
  .award-container {
    grid-template-columns: 1fr;
  }
}
</style>
