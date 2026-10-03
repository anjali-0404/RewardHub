<template>
  <div class="dashboard-layout">
    <AppHeader />
    <div class="dashboard-content">
      <AppSidebar />
      <main class="main-content">
        <div class="page-header">
          <h1>Student Dashboard</h1>
          <p class="text-secondary">Welcome back!</p>
        </div>

        <!-- Student Details Section -->
        <StudentDetails />

        <div class="stats-grid">
          <div class="stat-card card">
            <div class="stat-header">
              <h3>Available Balance</h3>
              <button
                @click="handleRefreshBalance"
                :disabled="!walletStore.isConnected || walletStore.refreshing"
                class="btn-refresh"
                :class="{ spinning: walletStore.refreshing }"
                aria-label="Refresh token balance"
                title="Refresh balance"
              >
                <RefreshIcon />
              </button>
            </div>
            <p class="stat-value">{{ walletStore.balance || 0 }}</p>
            <p class="text-secondary">Reward tokens</p>
            <div
              v-if="walletStore.databaseRedemptions > 0"
              class="balance-breakdown"
            >
              <small class="breakdown-text">
                Blockchain: {{ walletStore.blockchainBalance }} tokens<br />
                Database redemptions: -{{ walletStore.databaseRedemptions }}
                tokens
              </small>
            </div>
          </div>

          <div class="stat-card card">
            <h3>Wallet Status</h3>
            <p v-if="walletStore.isConnected" class="text-success">Connected</p>
            <p v-else class="text-secondary">Not Connected</p>
            <button
              v-if="!walletStore.isConnected"
              @click="connectWallet"
              class="btn btn-primary btn-sm mt-2"
            >
              Connect Wallet
            </button>
          </div>
        </div>

        <!-- Faculty Recognition / Achievements Section -->
        <FacultyRecognitions ref="recognitionsRef" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import AppHeader from "@/components/common/AppHeader.vue";
import AppSidebar from "@/components/common/AppSidebar.vue";
import StudentDetails from "@/components/student/StudentDetails.vue";
import FacultyRecognitions from "@/components/student/FacultyRecognitions.vue";
import RefreshIcon from "@/components/icons/RefreshIcon.vue";
import { useWalletStore } from "@/stores/wallet";
import { getErrorMessage } from "@/utils/errorHandler";

const recognitionsRef = ref(null);

const walletStore = useWalletStore();

async function connectWallet() {
  try {
    await walletStore.connect();
    window.$toast?.("Wallet connected successfully!", "success");
    // Fetch balance after connecting
    await walletStore.fetchBalance();
  } catch (error) {
    window.$toast?.("Error connecting wallet: " + error.message, "error");
  }
}

async function handleRefreshBalance() {
  if (!walletStore.isConnected) {
    window.$toast?.("Please connect your wallet first", "warning");
    return;
  }

  try {
    await walletStore.fetchBalance(true); // true = manual refresh
    window.$toast?.("Balance refreshed successfully!", "success");
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    window.$toast?.(
      errorMessage || "Failed to refresh balance. Please try again.",
      "error"
    );
  }
}

async function refreshBalance() {
  if (walletStore.isConnected && walletStore.address) {
    await walletStore.fetchBalance();
  }
}

// Handle page visibility changes to refresh balance when user returns to tab
function handleVisibilityChange() {
  if (!document.hidden) {
    refreshBalance();
  }
}

onMounted(async () => {
  await walletStore.checkStatus();
  // Fetch balance if wallet is already connected
  await refreshBalance();
  walletStore.setupListeners();

  // Add visibility change listener
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
  // Clean up listener
  document.removeEventListener("visibilitychange", handleVisibilityChange);
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.stat-card h3 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin: 0;
}

.btn-refresh {
  background: transparent;
  border: none;
  padding: 0.375rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-refresh:hover:not(:disabled) {
  color: var(--primary-color);
  background: var(--bg-tertiary);
  transform: scale(1.05);
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-refresh.spinning {
  animation: spin 1s linear infinite;
  color: var(--primary-color);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.stat-value {
  font-size: var(--font-size-4xl);
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.balance-breakdown {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.breakdown-text {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  line-height: 1.6;
}
</style>
