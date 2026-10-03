<template>
  <div class="dashboard-layout">
    <AppHeader />
    <div class="dashboard-content">
      <AppSidebar />
      <main class="main-content">
        <div class="page-header">
          <h1>Wallet Management</h1>
        </div>

        <div class="card">
          <div v-if="!walletStore.isConnected" class="wallet-connect">
            <h3>Connect Your Wallet</h3>
            <p class="text-secondary">
              Connect your MetaMask wallet to receive and redeem tokens
            </p>
            <button
              @click="handleConnect"
              class="btn btn-primary"
              :disabled="loading"
            >
              {{ loading ? "Connecting..." : "Connect MetaMask" }}
            </button>
          </div>

          <div v-else class="wallet-info">
            <h3>Wallet Connected</h3>
            <div class="info-row">
              <span class="label">Address:</span>
              <span class="value">{{
                truncateAddress(walletStore.address)
              }}</span>
            </div>
            <div class="info-row">
              <span class="label">Available Balance:</span>
              <span class="value balance-highlight">{{ walletStore.balance }} EDU</span>
            </div>
            <div class="info-row">
              <span class="label">Total Earned:</span>
              <span class="value">{{ walletStore.totalEarned }} EDU</span>
            </div>
            <div class="info-row">
              <span class="label">Total Redeemed:</span>
              <span class="value">-{{ walletStore.totalSpent }} EDU</span>
            </div>
            <div class="info-row">
              <span class="label">On-Chain Balance:</span>
              <span class="value">{{ walletStore.blockchainBalance }} EDU</span>
            </div>
            <div v-if="walletStore.balanceSource" class="info-row">
              <span class="label">Balance Source:</span>
              <span class="value">{{ walletStore.balanceSource }}</span>
            </div>
            <div class="wallet-actions">
              <button
                @click="handleRefresh"
                class="btn btn-secondary"
                :disabled="walletStore.refreshing"
              >
                {{ walletStore.refreshing ? "Refreshing..." : "Refresh Balance" }}
              </button>
              <button @click="handleDisconnect" class="btn btn-danger">
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>

        <div v-if="walletStore.isConnected" class="card mt-3">
          <div class="tx-header">
            <h3>Transaction History</h3>
            <button
              @click="loadTransactions"
              class="btn btn-secondary btn-sm"
              :disabled="loadingTx"
            >
              {{ loadingTx ? "Loading..." : "Refresh" }}
            </button>
          </div>
          <div v-if="walletStore.transactions.length === 0" class="empty-tx">
            <p class="text-secondary">No transactions yet. Faculty rewards and redemptions will appear here.</p>
          </div>
          <div v-else class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in walletStore.transactions" :key="tx.kind + '-' + tx.id">
                  <td>{{ formatDate(tx.date) }}</td>
                  <td>{{ txLabel(tx.kind) }}</td>
                  <td>{{ tx.title }}</td>
                  <td :class="tx.amount >= 0 ? 'text-success' : 'text-danger'">
                    {{ tx.amount >= 0 ? "+" : "" }}{{ tx.amount }} EDU
                  </td>
                  <td>{{ tx.status }}</td>
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
import { ref, onMounted } from "vue";
import AppHeader from "@/components/common/AppHeader.vue";
import AppSidebar from "@/components/common/AppSidebar.vue";
import { useWalletStore } from "@/stores/wallet";
import { truncateAddress } from "@/utils/helpers";
import { parseApiError } from "@/utils/errorParser";

const walletStore = useWalletStore();
const loading = ref(false);
const loadingTx = ref(false);

async function handleConnect() {
  loading.value = true;
  try {
    await walletStore.connect();
    await loadTransactions();
    window.$toast?.("Wallet connected successfully!", "success");
  } catch (error) {
    window.$toast?.(parseApiError(error), "error");
  } finally {
    loading.value = false;
  }
}

async function handleRefresh() {
  try {
    await walletStore.fetchBalance(true);
    await loadTransactions();
    window.$toast?.("Balance refreshed successfully!", "success");
  } catch (error) {
    window.$toast?.(parseApiError(error), "error");
  }
}

async function loadTransactions() {
  loadingTx.value = true;
  try {
    await walletStore.fetchTransactions();
  } finally {
    loadingTx.value = false;
  }
}

function txLabel(kind) {
  if (kind === "faculty_reward") return "Faculty Reward";
  if (kind === "achievement") return "Achievement";
  return "Redemption";
}

function formatDate(d) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function handleDisconnect() {
  try {
    await walletStore.disconnect();
    window.$toast?.("Wallet disconnected successfully!", "success");
  } catch (error) {
    window.$toast?.(parseApiError(error), "error");
  }
}

onMounted(async () => {
  await walletStore.checkStatus();
  await walletStore.fetchBalance();
  await loadTransactions();
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

.wallet-connect,
.wallet-info {
  text-align: center;
  padding: 2rem;
}

.wallet-connect h3,
.wallet-info h3 {
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: var(--text-secondary);
}

.value {
  font-family: monospace;
  color: var(--text-primary);
}

.balance-highlight {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--success-color, #10b981);
}

.wallet-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.25rem;
  flex-wrap: wrap;
}

.tx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tx-header h3 {
  margin: 0;
}

.empty-tx {
  text-align: center;
  padding: 1.5rem;
}

.table-container {
  overflow-x: auto;
}
</style>
