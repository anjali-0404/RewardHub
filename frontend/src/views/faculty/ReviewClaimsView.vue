<template>
  <div class="dashboard-layout">
    <AppHeader />
    <div class="dashboard-content">
      <AppSidebar />
      <main class="main-content">
        <div class="page-header header-flex">
          <div>
            <h1>Review Student Claims</h1>
            <p class="text-secondary">
              Approve student-uploaded achievements to mint tokens, or reject with feedback
            </p>
          </div>
          <button @click="loadClaims" class="btn btn-secondary btn-sm" :disabled="loading">
            {{ loading ? "Loading..." : "Refresh" }}
          </button>
        </div>

        <div class="metric-pill">
          <span class="metric-label">Pending Review</span>
          <span class="metric-val">{{ claims.length }}</span>
        </div>

        <LoadingSpinner v-if="loading" />

        <div v-else-if="claims.length === 0" class="empty-state card">
          <h3>No Pending Claims</h3>
          <p class="text-secondary">Student-uploaded achievements awaiting your review will appear here.</p>
        </div>

        <div v-else class="claims-grid">
          <div v-for="claim in claims" :key="claim._id" class="claim-card card">
            <div class="claim-top">
              <div>
                <h3>{{ displayTitle(claim) }}</h3>
                <p class="student-line">
                  by <strong>{{ claim.studentId?.name || "Student" }}</strong>
                  <span class="text-secondary">({{ claim.studentId?.email }})</span>
                  <span
                    v-if="claim.studentId?.walletConnected"
                    class="badge badge-success wallet-badge"
                  >✓ Wallet</span>
                  <span v-else class="badge badge-danger wallet-badge">No Wallet</span>
                </p>
              </div>
              <span class="badge badge-primary">{{ displayTokens(claim) }} tokens</span>
            </div>

            <p v-if="displayDesc(claim)" class="claim-desc">{{ displayDesc(claim) }}</p>

            <div class="claim-meta">
              <span v-if="claim.evidenceUrl" class="meta-item">
                🔗 <a :href="claim.evidenceUrl" target="_blank" rel="noopener">View Evidence ↗</a>
              </span>
              <span v-if="claim.note" class="meta-item">📝 Student note: "{{ claim.note }}"</span>
              <span class="meta-item text-secondary">Submitted: {{ formatDate(claim.createdAt) }}</span>
            </div>

            <div class="review-box">
              <input
                v-model="reviewNotes[claim._id]"
                class="form-input"
                placeholder="Feedback for student (optional for approve, required context for reject)"
                :disabled="processingId === claim._id"
              />
              <div v-if="isCustom(claim)" class="token-override">
                <label>Tokens for new catalog entry:</label>
                <input
                  v-model.number="tokenOverrides[claim._id]"
                  type="number"
                  min="1"
                  step="1"
                  class="form-input token-input"
                  :disabled="processingId === claim._id"
                />
              </div>
              <div class="review-actions">
                <button
                  @click="handleReview(claim, 'approve')"
                  class="btn btn-success btn-sm"
                  :disabled="processingId === claim._id || !canApprove(claim)"
                  :title="!claim.studentId?.walletConnected ? 'Student must connect wallet first' : 'Approve and mint tokens'"
                >
                  {{ processingId === claim._id ? "Processing..." : "Approve & Mint" }}
                </button>
                <button
                  @click="handleReview(claim, 'reject')"
                  class="btn btn-danger btn-sm"
                  :disabled="processingId === claim._id"
                >
                  Reject
                </button>
              </div>
              <p v-if="!claim.studentId?.walletConnected" class="warn-text">
                ⚠️ Student has no wallet connected — approval will fail until they connect MetaMask.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import AppHeader from "@/components/common/AppHeader.vue";
import AppSidebar from "@/components/common/AppSidebar.vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import {
  getPendingClaims,
  reviewClaim,
} from "@/services/studentAchievement.service";
import { formatDate } from "@/utils/helpers";
import { parseApiError } from "@/utils/errorParser";

const claims = ref([]);
const loading = ref(false);
const processingId = ref(null);
const reviewNotes = ref({});
const tokenOverrides = ref({});

function displayTitle(c) {
  return c.achievementId?.title || c.claimTitle || "Achievement";
}

function displayDesc(c) {
  return c.achievementId?.description || c.claimDescription || "";
}

function displayTokens(c) {
  return c.achievementId?.tokenReward ?? tokenOverrides.value[c._id] ?? 10;
}

function isCustom(c) {
  return !c.achievementId;
}

function canApprove(c) {
  return !!c.studentId?.walletConnected;
}

async function loadClaims() {
  loading.value = true;
  try {
    const data = await getPendingClaims();
    claims.value = data.claims || [];
  } catch (error) {
    window.$toast?.(parseApiError(error), "error");
  } finally {
    loading.value = false;
  }
}

async function handleReview(claim, action) {
  processingId.value = claim._id;
  try {
    const payload = {
      action,
      reviewNote: (reviewNotes.value[claim._id] || "").trim(),
    };
    if (action === "approve" && isCustom(claim)) {
      const t = tokenOverrides.value[claim._id];
      if (Number.isInteger(t) && t > 0) payload.tokenReward = t;
    }
    const res = await reviewClaim(claim._id, payload);
    window.$toast?.(res.msg || `Claim ${action}d!`, "success");
    await loadClaims();
  } catch (error) {
    window.$toast?.(parseApiError(error), "error");
  } finally {
    processingId.value = null;
  }
}

onMounted(() => {
  loadClaims();
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
  margin-bottom: 1.5rem;
}

.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.metric-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 0.75rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1.25rem;
  border-radius: var(--border-radius-lg);
  margin-bottom: 1.5rem;
}

.metric-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.metric-val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.claims-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.claim-card {
  border-left: 3px solid var(--warning-color, #f59e0b);
}

.claim-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.claim-top h3 {
  margin: 0 0 0.25rem 0;
}

.student-line {
  font-size: 0.85rem;
  margin: 0;
}

.wallet-badge {
  margin-left: 0.5rem;
}

.claim-desc {
  margin: 0.75rem 0;
  color: var(--text-secondary);
}

.claim-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.review-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.token-override {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.token-input {
  width: 100px;
}

.review-actions {
  display: flex;
  gap: 0.75rem;
}

.warn-text {
  font-size: 0.8rem;
  color: var(--warning-color, #f59e0b);
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
}
</style>
