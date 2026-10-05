/**
 * Format date to readable string
 */
export function formatDate(date) {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format token amount
 */
export function formatTokens(amount) {
  if (amount === null || amount === undefined) return "0";
  return Number(amount).toLocaleString();
}

/**
 * Truncate wallet address for display
 */
export function truncateAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Extract error message from API response
 */
export function getErrorMessage(error) {
  if (error.response?.data?.msg) {
    return error.response.data.msg;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.code === "ERR_NETWORK" || error.message?.includes("Network Error")) {
    return "Cannot connect to server. Please check your internet connection or verify the backend is running.";
  }
  if (error.message) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Get blockchain explorer URL for transaction
 */
export function getExplorerUrl(txHash) {
  // For local development, return placeholder
  if (!txHash) return "#";
  return `https://etherscan.io/tx/${txHash}`;
}
