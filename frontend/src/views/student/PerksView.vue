<template>
  <div class="dashboard-layout">
    <AppHeader />
    <div class="dashboard-content">
      <AppSidebar />
      <main class="main-content">
        <div class="page-header header-flex">
          <div>
            <h1>Available Perks</h1>
            <p class="text-secondary">Redeem your tokens for rewards</p>
          </div>
          <div v-if="walletStore.isConnected" class="balance-badge">
            <span class="balance-title">Available Balance:</span>
            <span class="balance-num">{{ walletStore.balance }} EDU</span>
            <button
              @click="walletStore.fetchBalance(true)"
              class="balance-refresh-btn"
              title="Refresh Balance"
              :disabled="walletStore.refreshing"
            >
              <span :class="{ spin: walletStore.refreshing }">↻</span>
            </button>
          </div>
          <div v-else class="wallet-alert-badge">
            <span>⚠️ Connect MetaMask to redeem perks</span>
          </div>
        </div>

        <LoadingSpinner v-if="loading" />
        <div v-else>
          <div class="perks-grid">
            <div v-for="perk in perks" :key="perk._id" class="perk-card card">
              <div class="perk-title-row">
                <h3>{{ perk.title }}</h3>
                <span v-if="perk.onChainCreated" class="badge badge-info" title="Verified on Hardhat Blockchain">⛓️ On-Chain</span>
              </div>
              <p>{{ perk.description }}</p>
              <div class="perk-footer">
                <span class="badge badge-primary">{{ perk.tokenCost }} tokens</span>
                <button
                  @click="redeemPerk(perk)"
                  class="btn btn-sm"
                  :class="canAfford(perk) ? 'btn-success' : 'btn-disabled-tokens'"
                  :disabled="!walletStore.isConnected || redeemingId === perk._id || !canAfford(perk)"
                >
                  <span v-if="redeemingId === perk._id">Redeeming...</span>
                  <span v-else-if="!walletStore.isConnected">Connect Wallet</span>
                  <span v-else-if="!canAfford(perk)">Need {{ perk.tokenCost - walletStore.balance }} more EDU</span>
                  <span v-else>Redeem</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Redemption History Section -->
          <div class="redemption-history mt-4">
            <h2>Redemption History</h2>
            <LoadingSpinner v-if="loadingRedemptions" />
            <div v-else-if="redemptions.length === 0" class="empty-state">
              <p>No redemptions yet. Redeem your first perk above!</p>
            </div>
            <div v-else class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Perk</th>
                    <th>Token Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="redemption in redemptions" :key="redemption._id">
                    <td>{{ formatDate(redemption.date || redemption.createdAt) }}</td>
                    <td>{{ redemption.rewardId?.title || "N/A" }}</td>
                    <td>{{ redemption.rewardId?.tokenCost || 0 }} tokens</td>
                    <td>
                      <span class="badge badge-success">Redeemed</span>
                    </td>
                  </tr>
                </tbody>
              </table>
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
import { useWalletStore } from "@/stores/wallet";
import { useAuthStore } from "@/stores/auth";
import { getRewards } from "@/services/perk.service";
import {
  redeemPerk as redeemPerkService,
  getStudentRedemptions,
} from "@/services/redemption.service";
import { parseApiError } from "@/utils/errorParser";

const walletStore = useWalletStore();
const authStore = useAuthStore();
const perks = ref([]);
const redemptions = ref([]);
const loading = ref(false);
const loadingRedemptions = ref(false);
const redeemingId = ref(null);

function canAfford(perk) {
  if (!walletStore.isConnected) return false;
  return walletStore.balance >= perk.tokenCost;
}

async function loadPerks() {
  loading.value = true;
  try {
    const data = await getRewards();
    perks.value = data.rewards;
  } catch (error) {
    const errorMsg = error?.message || parseApiError(error);
    window.$toast?.(errorMsg, "error");
  } finally {
    loading.value = false;
  }
}

async function redeemPerk(perk) {
  const perkId = perk._id || perk;
  const cost = perk.tokenCost || 0;

  if (!walletStore.isConnected) {
    window.$toast?.("Please connect your MetaMask wallet first!", "warning");
    return;
  }

  if (walletStore.balance < cost) {
    const diff = cost - walletStore.balance;
    window.$toast?.(
      `Insufficient tokens: You have ${walletStore.balance} EDU, but "${perk.title}" requires ${cost} tokens (need ${diff} more). Complete achievements or earn faculty recognitions first!`,
      "warning"
    );
    return;
  }

  redeemingId.value = perkId;
  try {
    const res = await redeemPerkService(perkId, walletStore.address);
    window.$toast?.(res?.msg || "Perk redeemed successfully!", "success");
    await walletStore.fetchBalance(); // Refresh balance to show updated tokens
    await loadRedemptions(); // Refresh redemption history
  } catch (error) {
    const errorMsg = error?.message || parseApiError(error);
    window.$toast?.(errorMsg, "error");
  } finally {
    redeemingId.value = null;
  }
}

async function loadRedemptions() {
  loadingRedemptions.value = true;
  try {
    const userId = authStore.user?.id;
    if (!userId) {
      return;
    }

    const data = await getStudentRedemptions(userId);
    redemptions.value = data.redemptions || [];
  } catch (error) {
    console.error("Error loading redemptions:", error);
    const errorMsg = error?.message || parseApiError(error);
    window.$toast?.(errorMsg, "error");
  } finally {
    loadingRedemptions.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(async () => {
  loadPerks();
  loadRedemptions();
  if (walletStore.isConnected) {
    try {
      await walletStore.fetchBalance();
    } catch {
      // Ignore initial balance fetch error
    }
  }
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

.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.balance-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1.1rem;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 9999px;
  color: #10b981;
}

.balance-title {
  font-size: 0.85rem;
  font-weight: 500;
  opacity: 0.85;
}

.balance-num {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.balance-refresh-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #10b981;
  font-size: 1.1rem;
  padding: 0 0.2rem;
  line-height: 1;
  transition: transform 0.2s ease;
}

.balance-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.wallet-alert-badge {
  padding: 0.5rem 1rem;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 9999px;
  color: #f59e0b;
  font-size: 0.85rem;
  font-weight: 600;
}

.perks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.perk-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.perk-card h3 {
  margin-bottom: 0;
}

.badge-info {
  background: rgba(14, 165, 233, 0.15);
  color: #0ea5e9;
  border: 1px solid rgba(14, 165, 233, 0.3);
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.btn-disabled-tokens {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-muted, #888);
  border: 1px solid var(--border-color, #444);
  cursor: not-allowed;
  opacity: 0.75;
}

.perk-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}
</style>
