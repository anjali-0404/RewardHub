import api from "./api";

/**
 * Wallet Management Service
 * Endpoints: 4-7
 */

// POST /api/users/wallet/nonce
export const generateNonce = async (walletAddress) => {
  const response = await api.post("/users/wallet/nonce", { walletAddress });
  return response.data;
};

// POST /api/users/wallet/verify
export const verifyWallet = async (walletAddress, signature) => {
  const response = await api.post("/users/wallet/verify", {
    address: walletAddress, // Backend expects 'address', not 'walletAddress'
    signature,
  });
  return response.data;
};

// POST /api/users/wallet/disconnect
export const disconnectWallet = async () => {
  const response = await api.post("/users/wallet/disconnect");
  return response.data;
};

// GET /api/users/wallet/status
export const getWalletStatus = async () => {
  const response = await api.get("/users/wallet/status");
  return response.data;
};

// GET /api/users/wallet/calculated-balance
export const getCalculatedBalance = async () => {
  const response = await api.get("/users/wallet/calculated-balance");
  return response.data;
};

// GET /api/users/wallet/transactions
export const getTransactions = async () => {
  const response = await api.get("/users/wallet/transactions");
  return response.data;
};
