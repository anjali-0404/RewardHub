import api from "./api";
import { ethers } from "ethers";

/**
 * Blockchain Service
 * Endpoints: 36-37
 */

// GET /api/blockchain/balance/:wallet
export const getTokenBalance = async (walletAddress) => {
  const response = await api.get(`/blockchain/balance/${walletAddress}`);
  return response.data;
};

// POST /api/students/register
// Backend expects: { name, email, password, walletAddress, message, signature }
export const registerStudentOnChain = async (payload) => {
  const response = await api.post("/students/register", payload);
  return response.data;
};

/**
 * MetaMask Integration
 */

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== "undefined";
};

// Request MetaMask account access
export const requestAccounts = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return accounts;
};

// Get current MetaMask account
export const getCurrentAccount = async () => {
  if (!isMetaMaskInstalled()) {
    return null;
  }
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] || null;
};

// Sign message with MetaMask using personal_sign
export const signMessage = async (message, account) => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }

  // If no account provided, get the current account
  if (!account) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    account = accounts[0];
  }

  // Use personal_sign with explicit account parameter
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, account],
  });

  return signature;
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.on("accountsChanged", callback);
  }
};

// Listen for chain changes
export const onChainChanged = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.on("chainChanged", callback);
  }
};
