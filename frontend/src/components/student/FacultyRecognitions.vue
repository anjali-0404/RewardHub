<template>
  <div class="faculty-recognitions-section">
    <!-- Header with Stats & Actions -->
    <div class="section-header">
      <div class="header-left">
        <div class="section-title-wrapper">
          <div class="title-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
              />
            </svg>
          </div>
          <div>
            <h2 class="section-title">Faculty Recognition / Achievements</h2>
            <p class="section-subtitle">
              Permanent verified awards and recognitions granted by faculty members
            </p>
          </div>
        </div>
      </div>

      <div class="header-right">
        <!-- Refresh Button -->
        <button
          @click="fetchRecognitions"
          class="btn btn-secondary btn-sm btn-icon-only"
          :class="{ spinning: loading }"
          title="Refresh Recognitions"
          aria-label="Refresh Recognitions"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="refresh-icon"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Summary Metrics Bar -->
    <div class="metrics-row">
      <div class="metric-pill">
        <span class="metric-label">Total Recognitions</span>
        <span class="metric-val">{{ rewards.length }}</span>
      </div>
      <div class="metric-pill highlight">
        <span class="metric-label">EDU Earned from Faculty</span>
        <span class="metric-val">{{ totalTokensEarned }} EDU</span>
      </div>
      <div class="metric-pill" :class="{ alert: pendingCount > 0 }">
        <span class="metric-label">Pending Acknowledgment</span>
        <span class="metric-val">{{ pendingCount }}</span>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button
        @click="activeFilter = 'all'"
        class="tab-btn"
        :class="{ active: activeFilter === 'all' }"
      >
        All ({{ rewards.length }})
      </button>
      <button
        @click="activeFilter = 'pending_ack'"
        class="tab-btn"
        :class="{ active: activeFilter === 'pending_ack' }"
      >
        Pending Acknowledgment ({{ pendingCount }})
      </button>
      <button
        @click="activeFilter = 'confirmed'"
        class="tab-btn"
        :class="{ active: activeFilter === 'confirmed' }"
      >
        Verified On-Chain ({{ confirmedCount }})
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && rewards.length === 0" class="loading-state card">
      <LoadingSpinner />
      <p>Loading your faculty recognition records from blockchain & database...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-banner card">
      <div class="error-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="error-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div class="error-text">
          <strong>Failed to load recognitions:</strong> {{ error }}
        </div>
      </div>
      <button @click="fetchRecognitions" class="btn btn-sm btn-primary">
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredRewards.length === 0" class="empty-state card">
      <div class="empty-icon-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="empty-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
          />
        </svg>
      </div>
      <h3>{{ emptyStateTitle }}</h3>
      <p class="empty-desc">
        {{ emptyStateDesc }}
      </p>
    </div>

    <!-- Recognition Cards Grid -->
    <div v-else class="recognitions-grid">
      <div
        v-for="reward in filteredRewards"
        :key="reward._id || reward.rewardId"
        class="recognition-card"
        :class="{
          'is-pending-ack': reward.acknowledgementStatus === 'pending',
          'is-confirmed': reward.transactionStatus === 'confirmed',
          'is-failed': reward.transactionStatus === 'failed',
        }"
      >
        <!-- Card Top: Reason & Amount -->
        <div class="card-top-row">
          <div class="reason-area">
            <div class="badge-row">
              <span class="reward-id-badge">{{ reward.rewardId }}</span>
              <span
                class="status-pill"
                :class="getStatusClass(reward.transactionStatus)"
              >
                <span class="status-indicator"></span>
                {{ getStatusLabel(reward.transactionStatus) }}
              </span>
            </div>
            <h3 class="achievement-reason">{{ reward.achievementReason }}</h3>
          </div>

          <div class="amount-badge-container">
            <div class="edu-amount-badge">
              <span class="amount-prefix">+</span>
              <span class="amount-number">{{ reward.amount }}</span>
              <span class="amount-unit">EDU</span>
            </div>
          </div>
        </div>

        <!-- Optional Faculty Personal Note -->
        <div v-if="reward.note" class="faculty-note-box">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            class="quote-icon"
          >
            <path
              d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"
            />
          </svg>
          <p class="note-text">{{ reward.note }}</p>
        </div>

        <!-- WHO: Faculty Profile Details -->
        <div class="faculty-profile-strip">
          <div class="faculty-avatar">
            <span class="avatar-initials">{{ getInitials(reward.facultyDetails?.name) }}</span>
          </div>
          <div class="faculty-info">
            <div class="faculty-name-row">
              <span class="faculty-label">Awarded by:</span>
              <span class="faculty-name">{{ reward.facultyDetails?.name || "Faculty Member" }}</span>
            </div>
            <div class="faculty-dept-row">
              <span v-if="reward.facultyDetails?.designation" class="faculty-desig">
                {{ reward.facultyDetails.designation }}
              </span>
              <span
                v-if="reward.facultyDetails?.designation && reward.facultyDetails?.department"
                class="separator"
                >•</span
              >
              <span v-if="reward.facultyDetails?.department" class="faculty-dept">
                {{ reward.facultyDetails.department }}
              </span>
            </div>
          </div>

          <!-- Faculty Wallet Chip -->
          <div v-if="reward.facultyWallet" class="wallet-chip" title="Faculty Wallet">
            <span class="wallet-chip-label">Faculty Wallet:</span>
            <span class="wallet-chip-address">{{ formatAddress(reward.facultyWallet) }}</span>
            <button
              @click="copyToClipboard(reward.facultyWallet, 'Faculty wallet')"
              class="copy-btn"
              title="Copy address"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-3.5 h-3.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.666 3.849A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.599m9.332 0c.053.332.084.673.084 1.021v.5a2.25 2.25 0 01-2.25 2.25h-6.75a2.25 2.25 0 01-2.25-2.25v-.5c0-.348.031-.69.084-1.021m9.332 0a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V6.099a2.25 2.25 0 012.25-2.25"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- WHEN & BLOCKCHAIN VERIFICATION -->
        <div class="blockchain-meta-strip">
          <div class="meta-item">
            <span class="meta-icon">📅</span>
            <span class="meta-text">{{ formatDateTime(reward.timestamp) }}</span>
          </div>

          <!-- Student Wallet -->
          <div class="meta-item">
            <span class="meta-icon">🎓</span>
            <span class="meta-text" title="Recipient Wallet">
              Student Wallet: {{ formatAddress(reward.studentWallet) }}
            </span>
          </div>

          <!-- Transaction Hash with Verify Modal/Link -->
          <div v-if="reward.transactionHash" class="meta-item tx-item">
            <span class="meta-icon">⛓️</span>
            <span class="tx-hash" title="Blockchain Transaction Hash">
              Tx: {{ formatAddress(reward.transactionHash) }}
            </span>
            <button
              @click="copyToClipboard(reward.transactionHash, 'Transaction Hash')"
              class="copy-btn"
              title="Copy Transaction Hash"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-3.5 h-3.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.666 3.849A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.599m9.332 0c.053.332.084.673.084 1.021v.5a2.25 2.25 0 01-2.25 2.25h-6.75a2.25 2.25 0 01-2.25-2.25v-.5c0-.348.031-.69.084-1.021m9.332 0a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V6.099a2.25 2.25 0 012.25-2.25"
                />
              </svg>
            </button>
            <button
              @click="openVerifyModal(reward)"
              class="btn-verify-link"
              title="View cryptographic proof on blockchain"
            >
              Verify On-Chain ↗
            </button>
          </div>
          <div v-else class="meta-item pending-tx">
            <span class="meta-icon">⏳</span>
            <span class="meta-text text-secondary">
              {{ reward.transactionStatus === 'failed' ? 'Transaction failed to confirm' : 'Pending blockchain confirmation...' }}
            </span>
          </div>
        </div>

        <!-- Card Footer: ACKNOWLEDGEMENT STATUS -->
        <div class="card-footer">
          <div class="immutable-notice">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="lock-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span>Immutable permanent record</span>
          </div>

          <div class="ack-area">
            <!-- Acknowledged State -->
            <div
              v-if="reward.acknowledgementStatus === 'acknowledged'"
              class="ack-badge-confirmed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
                class="ack-check-icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              <div class="ack-text-group">
                <span class="ack-title">Acknowledged</span>
                <span v-if="reward.acknowledgementTimestamp" class="ack-time">
                  {{ formatDateTime(reward.acknowledgementTimestamp) }}
                </span>
              </div>
            </div>

            <!-- Pending Acknowledgment Button -->
            <div v-else class="ack-action-container">
              <button
                @click="handleAcknowledge(reward)"
                :disabled="acknowledgingId === reward._id || acknowledgingId === reward.rewardId"
                class="btn btn-primary btn-ack"
              >
                <svg
                  v-if="acknowledgingId !== reward._id && acknowledgingId !== reward.rewardId"
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
                <span
                  v-if="acknowledgingId === reward._id || acknowledgingId === reward.rewardId"
                  class="spinner-sm"
                ></span>
                <span>
                  {{
                    acknowledgingId === reward._id || acknowledgingId === reward.rewardId
                      ? "Acknowledging..."
                      : "Acknowledge"
                  }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Blockchain Verification Modal -->
    <BaseModal
      v-if="selectedRewardForVerify"
      v-model="isVerifyModalOpen"
      title="Blockchain Verification Proof"
    >
      <div class="verify-modal-content">
        <div class="verify-header">
          <div class="verify-badge">
            <span class="status-indicator live"></span>
            Verified On-Chain
          </div>
          <p class="verify-subtitle">
            This recognition was cryptographically confirmed and minted directly to your EduToken wallet address.
          </p>
        </div>

        <div class="verify-details-list">
          <div class="verify-row">
            <span class="v-label">Reward ID:</span>
            <span class="v-value monospace">{{ selectedRewardForVerify.rewardId }}</span>
          </div>

          <div class="verify-row">
            <span class="v-label">Token Amount:</span>
            <span class="v-value font-bold text-success">
              +{{ selectedRewardForVerify.amount }} EDU Tokens
            </span>
          </div>

          <div class="verify-row">
            <span class="v-label">Achievement / Reason:</span>
            <span class="v-value">{{ selectedRewardForVerify.achievementReason }}</span>
          </div>

          <div class="verify-row">
            <span class="v-label">Awarded By:</span>
            <span class="v-value">
              {{ selectedRewardForVerify.facultyDetails?.name }}
              <small class="text-secondary" v-if="selectedRewardForVerify.facultyDetails?.department">
                ({{ selectedRewardForVerify.facultyDetails.department }})
              </small>
            </span>
          </div>

          <div class="verify-row">
            <span class="v-label">Faculty Wallet:</span>
            <span class="v-value monospace text-xs">
              {{ selectedRewardForVerify.facultyWallet || "N/A" }}
            </span>
          </div>

          <div class="verify-row">
            <span class="v-label">Student Recipient Wallet:</span>
            <span class="v-value monospace text-xs">
              {{ selectedRewardForVerify.studentWallet }}
            </span>
          </div>

          <div class="verify-row highlight-row">
            <span class="v-label">Transaction Hash:</span>
            <div class="v-value hash-group">
              <span class="monospace text-xs break-all">
                {{ selectedRewardForVerify.transactionHash }}
              </span>
              <button
                @click="copyToClipboard(selectedRewardForVerify.transactionHash, 'Tx Hash')"
                class="btn btn-secondary btn-xs mt-1"
              >
                Copy Hash
              </button>
            </div>
          </div>

          <div class="verify-row">
            <span class="v-label">Timestamp:</span>
            <span class="v-value">
              {{ formatDateTime(selectedRewardForVerify.timestamp) }}
            </span>
          </div>

          <div class="verify-row">
            <span class="v-label">Status:</span>
            <span class="v-value badge badge-success">Confirmed in Block</span>
          </div>
        </div>

        <div class="verify-modal-footer">
          <button
            @click="selectedRewardForVerify = null"
            class="btn btn-primary btn-block"
          >
            Close Proof
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import BaseModal from "@/components/common/BaseModal.vue";
import {
  getMyFacultyRewards,
  acknowledgeFacultyReward,
} from "@/services/facultyReward.service";
import { useWalletStore } from "@/stores/wallet";

const walletStore = useWalletStore();

const rewards = ref([]);
const loading = ref(false);
const error = ref(null);
const activeFilter = ref("all");
const acknowledgingId = ref(null);
const selectedRewardForVerify = ref(null);
const isVerifyModalOpen = ref(false);

const totalTokensEarned = computed(() => {
  return rewards.value
    .filter((r) => r.transactionStatus === "confirmed")
    .reduce((sum, r) => sum + (r.amount || 0), 0);
});

const pendingCount = computed(() => {
  return rewards.value.filter((r) => r.acknowledgementStatus === "pending").length;
});

const confirmedCount = computed(() => {
  return rewards.value.filter((r) => r.transactionStatus === "confirmed").length;
});

const filteredRewards = computed(() => {
  if (activeFilter.value === "pending_ack") {
    return rewards.value.filter((r) => r.acknowledgementStatus === "pending");
  }
  if (activeFilter.value === "confirmed") {
    return rewards.value.filter((r) => r.transactionStatus === "confirmed");
  }
  return rewards.value;
});

const emptyStateTitle = computed(() => {
  if (activeFilter.value === "pending_ack") return "No Pending Acknowledgments";
  if (activeFilter.value === "confirmed") return "No Confirmed Recognitions";
  return "No Faculty Recognitions Yet";
});

const emptyStateDesc = computed(() => {
  if (activeFilter.value === "pending_ack") {
    return "You have acknowledged all your faculty recognitions! Great job.";
  }
  if (activeFilter.value === "confirmed") {
    return "When a faculty member awards you EDU tokens and the transaction confirms on-chain, it will appear here.";
  }
  return "Faculty recognitions and academic milestone achievements awarded by professors will automatically appear here with cryptographic blockchain verification.";
});

async function fetchRecognitions() {
  loading.value = true;
  error.value = null;
  try {
    const data = await getMyFacultyRewards();
    rewards.value = data.rewards || [];
    // Keep the header/dashboard balance in sync so newly awarded EDU
    // shows up immediately without a manual refresh.
    try {
      await walletStore.fetchBalance();
    } catch {
      // Balance refresh is non-critical
    }
  } catch (err) {
    console.error("Error fetching faculty recognitions:", err);
    error.value = err.response?.data?.msg || err.message || "Failed to load recognitions";
  } finally {
    loading.value = false;
  }
}

async function handleAcknowledge(reward) {
  const targetId = reward.rewardId || reward._id;
  acknowledgingId.value = targetId;

  try {
    const res = await acknowledgeFacultyReward(targetId);
    
    // Update local state smoothly
    const idx = rewards.value.findIndex(
      (r) => r.rewardId === targetId || r._id === targetId
    );
    if (idx !== -1 && res.reward) {
      rewards.value[idx] = { ...rewards.value[idx], ...res.reward };
    } else {
      // Re-fetch to ensure sync
      await fetchRecognitions();
    }

    window.$toast?.("Recognition acknowledged successfully! ✓", "success");
  } catch (err) {
    console.error("Error acknowledging reward:", err);
    window.$toast?.(
      err.response?.data?.msg || err.message || "Failed to acknowledge reward",
      "error"
    );
  } finally {
    acknowledgingId.value = null;
  }
}

function openVerifyModal(reward) {
  selectedRewardForVerify.value = reward;
  isVerifyModalOpen.value = true;
}

function getStatusLabel(status) {
  if (status === "confirmed") return "Verified On-Chain";
  if (status === "failed") return "Transaction Failed";
  return "Pending Blockchain";
}

function getStatusClass(status) {
  if (status === "confirmed") return "status-confirmed";
  if (status === "failed") return "status-failed";
  return "status-pending";
}

function formatAddress(address) {
  if (!address) return "N/A";
  if (address.length < 12) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name) {
  if (!name) return "FA";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

async function copyToClipboard(text, label = "Item") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    window.$toast?.(`${label} copied to clipboard!`, "success");
  } catch {
    window.$toast?.(`Failed to copy ${label}`, "error");
  }
}

onMounted(() => {
  fetchRecognitions();
});

defineExpose({
  fetchRecognitions,
});
</script>

<style scoped>
.faculty-recognitions-section {
  margin-top: 2.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.title-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--border-radius-lg);
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
  border: 1px solid rgba(79, 70, 229, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-light);
  flex-shrink: 0;
}

.title-icon svg {
  width: 24px;
  height: 24px;
}

.section-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.section-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.btn-icon-only {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-md);
}

.refresh-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.spinning .refresh-icon {
  animation: spin 1s linear infinite;
}

/* Metrics Row */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric-pill {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  padding: 0.875rem 1.25rem;
  border-radius: var(--border-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: var(--shadow-xs);
  transition: all var(--transition-fast);
}

.metric-pill:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.4);
}

.metric-pill.highlight {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%);
}

.metric-pill.highlight .metric-val {
  color: var(--success-color);
}

.metric-pill.alert {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.05);
}

.metric-pill.alert .metric-val {
  color: var(--warning-color);
}

.metric-label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.metric-val {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  overflow-x: auto;
}

.tab-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.tab-btn.active {
  color: white;
  background: var(--primary-color);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

/* Cards Grid */
.recognitions-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.recognition-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  position: relative;
  transition: all var(--transition-base);
  overflow: hidden;
}

.recognition-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--primary-color);
  opacity: 0.8;
}

.recognition-card.is-confirmed::before {
  background: linear-gradient(to bottom, #10b981, #06b6d4);
}

.recognition-card.is-pending-ack {
  border-color: rgba(245, 158, 11, 0.4);
}

.recognition-card.is-pending-ack::before {
  background: var(--warning-color);
}

.recognition-card.is-failed::before {
  background: var(--danger-color);
}

.recognition-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(99, 102, 241, 0.3);
}

/* Card Top Row */
.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.reason-area {
  flex: 1;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.reward-id-badge {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  padding: 0.15rem 0.5rem;
  border-radius: var(--border-radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 0.2rem 0.625rem;
  border-radius: var(--border-radius-full);
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-confirmed {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-confirmed .status-indicator {
  box-shadow: 0 0 6px #10b981;
}

.status-pending {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-failed {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.achievement-reason {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

/* EDU Amount Badge */
.amount-badge-container {
  flex-shrink: 0;
}

.edu-amount-badge {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%);
  border: 1.5px solid rgba(79, 70, 229, 0.35);
  border-radius: var(--border-radius-lg);
  padding: 0.5rem 1rem;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1);
}

.amount-prefix {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--accent-teal);
}

.amount-number {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--primary-light);
  line-height: 1;
}

.amount-unit {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--accent-teal);
  letter-spacing: 0.05em;
}

/* Faculty Note Box */
.faculty-note-box {
  background: var(--bg-secondary);
  border-left: 3px solid var(--accent-teal);
  border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.quote-icon {
  width: 16px;
  height: 16px;
  color: var(--accent-teal);
  flex-shrink: 0;
  margin-top: 0.15rem;
  opacity: 0.8;
}

.note-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-style: italic;
  margin: 0;
  line-height: 1.5;
}

/* Faculty Profile Strip */
.faculty-profile-strip {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-lg);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.faculty-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.faculty-info {
  flex: 1;
  min-width: 200px;
}

.faculty-name-row {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.faculty-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.faculty-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.faculty-dept-row {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.1rem;
}

.separator {
  color: var(--text-tertiary);
}

.wallet-chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  padding: 0.3rem 0.6rem;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
}

.wallet-chip-label {
  color: var(--text-tertiary);
}

.wallet-chip-address {
  font-family: var(--font-family-mono);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.copy-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-sm);
  transition: color var(--transition-fast);
}

.copy-btn:hover {
  color: var(--primary-light);
}

/* Blockchain Meta Strip */
.blockchain-meta-strip {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color-subtle);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.tx-hash {
  font-family: var(--font-family-mono);
  color: var(--text-primary);
}

.btn-verify-link {
  background: transparent;
  border: 1px solid rgba(6, 182, 212, 0.4);
  color: var(--accent-teal);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: 0.2rem 0.6rem;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: 0.35rem;
}

.btn-verify-link:hover {
  background: rgba(6, 182, 212, 0.1);
  border-color: var(--accent-teal);
}

/* Card Footer: ACKNOWLEDGEMENT */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  gap: 1rem;
  flex-wrap: wrap;
}

.immutable-notice {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.lock-icon {
  width: 14px;
  height: 14px;
}

.ack-area {
  margin-left: auto;
}

.ack-badge-confirmed {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
  padding: 0.4rem 0.875rem;
  border-radius: var(--border-radius-full);
}

.ack-check-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.ack-text-group {
  display: flex;
  flex-direction: column;
}

.ack-title {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
  line-height: 1.2;
}

.ack-time {
  font-size: 0.7rem;
  color: rgba(16, 185, 129, 0.85);
}

.btn-ack {
  padding: 0.5rem 1.25rem;
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius-full);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: all var(--transition-fast);
}

.btn-ack:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  margin-bottom: 1.25rem;
}

.empty-icon {
  width: 32px;
  height: 32px;
}

.empty-state h3 {
  font-size: var(--font-size-lg);
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-desc {
  max-width: 480px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* Loading & Error */
.loading-state {
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
  padding: 1rem 1.25rem;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.error-icon {
  width: 20px;
  height: 20px;
  color: var(--danger-color);
  flex-shrink: 0;
}

/* Verify Modal Content */
.verify-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.verify-header {
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.verify-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
  padding: 0.35rem 0.85rem;
  border-radius: var(--border-radius-full);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  margin-bottom: 0.5rem;
}

.status-indicator.live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.verify-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
}

.verify-details-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.verify-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.6rem 0.75rem;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  gap: 1rem;
}

.verify-row.highlight-row {
  background: rgba(79, 70, 229, 0.08);
  border: 1px solid rgba(79, 70, 229, 0.2);
}

.v-label {
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  flex-shrink: 0;
}

.v-value {
  color: var(--text-primary);
  text-align: right;
  word-break: break-word;
}

.hash-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.break-all {
  word-break: break-all;
}

.verify-modal-footer {
  margin-top: 0.5rem;
}

.btn-block {
  width: 100%;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
  }
  .card-top-row {
    flex-direction: column;
  }
  .amount-badge-container {
    align-self: flex-start;
  }
  .faculty-profile-strip {
    flex-direction: column;
    align-items: flex-start;
  }
  .blockchain-meta-strip {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  .ack-area {
    margin-left: 0;
    width: 100%;
  }
  .btn-ack {
    width: 100%;
    justify-content: center;
  }
}
</style>
