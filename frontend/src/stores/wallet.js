import { defineStore } from "pinia";
import { ref, computed } from "vue";
import * as walletService from "@/services/wallet.service";
import * as blockchainService from "@/services/blockchain.service";
import { useAuthStore } from "./auth";

export const useWalletStore = defineStore("wallet", () => {
  const connected = ref(false);
  const address = ref(null);
  const balance = ref(0);
  const blockchainBalance = ref(0);
  const totalEarned = ref(0);
  const totalSpent = ref(0);
  const databaseRedemptions = ref(0);
  const balanceBreakdown = ref(null);
  const balanceSource = ref(null);
  const transactions = ref([]);
  const loading = ref(false);
  const refreshing = ref(false);
  const error = ref(null);

  const isConnected = computed(() => connected.value && !!address.value);

  // Check wallet status from backend
  async function checkStatus() {
    try {
      const data = await walletService.getWalletStatus();
      connected.value = data.walletConnected;
      address.value = data.walletAddress;

      if (connected.value && address.value) {
        await fetchBalance();
      }

      return data;
    } catch (err) {
      error.value = err;
      throw err;
    }
  }

  // Connect wallet with MetaMask
  async function connect() {
    try {
      loading.value = true;
      error.value = null;

      // Check if MetaMask is installed
      if (!blockchainService.isMetaMaskInstalled()) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
      }

      // Request account access
      const accounts = await blockchainService.requestAccounts();
      const walletAddress = accounts[0];

      // Get nonce from backend
      const { nonce } = await walletService.generateNonce(walletAddress);

      // Sign the exact nonce with MetaMask using the specific wallet address
      const signature = await blockchainService.signMessage(
        nonce,
        walletAddress
      );

      // Verify signature with backend
      const data = await walletService.verifyWallet(walletAddress, signature);

      connected.value = true;
      address.value = walletAddress;

      // Update auth store user data
      const authStore = useAuthStore();
      authStore.updateUser(data.user);

      // Fetch balance
      await fetchBalance();

      return data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Disconnect wallet
  async function disconnect() {
    try {
      loading.value = true;
      error.value = null;

      const data = await walletService.disconnectWallet();

      connected.value = false;
      address.value = null;
      balance.value = 0;

      // Update auth store
      const authStore = useAuthStore();
      authStore.updateUser(data.user);

      return data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Fetch token balance (blockchain with database fallback — never zeros out on chain errors)
  async function fetchBalance(isManualRefresh = false) {
    try {
      if (isManualRefresh) {
        refreshing.value = true;
      }

      // Calculated balance always returns 200 with DB fallback
      const data = await walletService.getCalculatedBalance();

      balance.value = data.availableBalance ?? 0;
      blockchainBalance.value = data.blockchainBalance ?? 0;
      totalEarned.value = data.totalEarned ?? 0;
      totalSpent.value = data.totalSpent ?? 0;
      databaseRedemptions.value = data.databaseRedemptions ?? 0;
      balanceBreakdown.value = data.breakdown ?? null;
      balanceSource.value = data.balanceSource ?? null;

      // Keep header/user wallet state in sync without forcing a reconnect
      if (data.walletAddress) {
        address.value = data.walletAddress;
        connected.value = !!data.walletConnected;
      }

      return data;
    } catch (err) {
      console.error("Error fetching balance:", err);

      // For manual refresh, throw error to show user feedback
      if (isManualRefresh) {
        throw err;
      }

      // Silent fail for automatic fetches: preserve last known balance
      // instead of flashing 0 (balance fetch is non-critical)
    } finally {
      if (isManualRefresh) {
        refreshing.value = false;
      }
    }
  }

  // Fetch unified transaction history (earnings + redemptions)
  async function fetchTransactions() {
    try {
      const data = await walletService.getTransactions();
      transactions.value = data.transactions || [];
      if (typeof data.totalEarned === "number") totalEarned.value = data.totalEarned;
      return data;
    } catch (err) {
      console.error("Error fetching transactions:", err);
      return null;
    }
  }

  // Setup MetaMask listeners
  function setupListeners() {
    blockchainService.onAccountsChanged(async (accounts) => {
      if (accounts.length === 0) {
        // User disconnected wallet in MetaMask
        await disconnect();
      } else if (accounts[0] !== address.value) {
        // User switched accounts
        address.value = accounts[0];
        await fetchBalance();
      }
    });

    blockchainService.onChainChanged(() => {
      // Reload page on chain change
      window.location.reload();
    });
  }

  return {
    connected,
    address,
    balance,
    blockchainBalance,
    totalEarned,
    totalSpent,
    databaseRedemptions,
    balanceBreakdown,
    balanceSource,
    transactions,
    loading,
    refreshing,
    error,
    isConnected,
    checkStatus,
    connect,
    disconnect,
    fetchBalance,
    fetchTransactions,
    setupListeners,
  };
});
