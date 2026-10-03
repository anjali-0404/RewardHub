/**
 * Centralized Error Handler for API Errors
 * Converts technical API errors into user-friendly messages
 */

/**
 * Error context types for different operations
 */
export const ErrorContext = {
  REDEMPTION: "redemption",
  ACHIEVEMENT: "achievement",
  WALLET: "wallet",
  AUTH: "auth",
  PERK: "perk",
  GENERAL: "general",
};

/**
 * User-friendly error messages for perk redemption
 */
const REDEMPTION_ERRORS = {
  INSUFFICIENT_BALANCE:
    "Not enough balance to redeem this perk. Earn more tokens by completing achievements!",
  PERK_NOT_FOUND:
    "This perk is no longer available. Please try a different perk.",
  WALLET_NOT_CONNECTED: "Please connect your wallet before redeeming perks.",
  BLOCKCHAIN_ERROR:
    "Unable to process redemption on the blockchain. Please try again later.",
  ALREADY_REDEEMED: "You have already redeemed this perk.",
  NETWORK_ERROR: "Connection error. Please check your internet and try again.",
  SERVER_ERROR:
    "Something went wrong on our end. Please try again in a few moments.",
};

/**
 * User-friendly error messages for general API operations
 */
const GENERAL_ERRORS = {
  400: "Invalid request. Please check your input and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This action conflicts with existing data.",
  422: "The data provided is invalid. Please check and try again.",
  500: "Server error. Please try again later.",
  503: "Service temporarily unavailable. Please try again later.",
  NETWORK: "Connection error. Please check your internet and try again.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
};

/**
 * Extract backend error message from axios error response
 * @param {Error} error - Axios error object
 * @returns {string|null} - Backend error message or null
 */
function getBackendMessage(error) {
  if (error.response?.data?.msg) {
    return error.response.data.msg;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  return null;
}

/**
 * Get HTTP status code from error
 * @param {Error} error - Axios error object
 * @returns {number|null} - HTTP status code or null
 */
function getStatusCode(error) {
  return error.response?.status || null;
}

/**
 * Check if error is a network error
 * @param {Error} error - Axios error object
 * @returns {boolean}
 */
function isNetworkError(error) {
  return (
    !error.response &&
    (error.code === "ERR_NETWORK" || error.message === "Network Error")
  );
}

/**
 * Handle perk redemption errors
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
function handleRedemptionError(error) {
  const backendMsg = getBackendMessage(error);
  const statusCode = getStatusCode(error);

  // Check for specific backend messages
  if (backendMsg) {
    const lowerMsg = backendMsg.toLowerCase();

    if (
      lowerMsg.includes("not enough tokens") ||
      lowerMsg.includes("insufficient")
    ) {
      return backendMsg.length < 150 ? backendMsg : REDEMPTION_ERRORS.INSUFFICIENT_BALANCE;
    }

    if (
      lowerMsg.includes("reward not found") ||
      lowerMsg.includes("perk not found")
    ) {
      return REDEMPTION_ERRORS.PERK_NOT_FOUND;
    }

    if (lowerMsg.includes("wallet") && lowerMsg.includes("not connected")) {
      return REDEMPTION_ERRORS.WALLET_NOT_CONNECTED;
    }

    if (lowerMsg.includes("blockchain")) {
      return REDEMPTION_ERRORS.BLOCKCHAIN_ERROR;
    }

    if (lowerMsg.includes("already redeemed")) {
      return REDEMPTION_ERRORS.ALREADY_REDEEMED;
    }
  }

  // Check for network errors
  if (isNetworkError(error)) {
    return REDEMPTION_ERRORS.NETWORK_ERROR;
  }

  // Handle by status code
  switch (statusCode) {
    case 400:
      return REDEMPTION_ERRORS.INSUFFICIENT_BALANCE; // Most common 400 in redemption
    case 404:
      return REDEMPTION_ERRORS.PERK_NOT_FOUND;
    case 500:
      return REDEMPTION_ERRORS.BLOCKCHAIN_ERROR;
    default:
      return REDEMPTION_ERRORS.SERVER_ERROR;
  }
}

/**
 * Handle wallet-related errors
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
function handleWalletError(error) {
  const backendMsg = getBackendMessage(error);
  const statusCode = getStatusCode(error);

  if (backendMsg) {
    const lowerMsg = backendMsg.toLowerCase();

    if (
      lowerMsg.includes("metamask") ||
      lowerMsg.includes("wallet not installed")
    ) {
      return "MetaMask is not installed. Please install MetaMask to connect your wallet.";
    }

    if (
      lowerMsg.includes("signature") ||
      lowerMsg.includes("verification failed")
    ) {
      return "Wallet verification failed. Please try connecting again.";
    }

    if (lowerMsg.includes("already connected")) {
      return "Wallet is already connected to another account.";
    }
  }

  if (isNetworkError(error)) {
    return GENERAL_ERRORS.NETWORK;
  }

  if (statusCode === 400) {
    return "Invalid wallet connection request. Please try again.";
  }

  return "Unable to connect wallet. Please try again.";
}

/**
 * Handle achievement-related errors
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
function handleAchievementError(error) {
  const backendMsg = getBackendMessage(error);
  const statusCode = getStatusCode(error);

  if (backendMsg) {
    const lowerMsg = backendMsg.toLowerCase();

    if (lowerMsg.includes("not found")) {
      return "Achievement not found.";
    }

    if (lowerMsg.includes("already awarded")) {
      return "This achievement has already been awarded to this student.";
    }
  }

  if (isNetworkError(error)) {
    return GENERAL_ERRORS.NETWORK;
  }

  if (statusCode === 404) {
    return "Achievement not found.";
  }

  return "Unable to process achievement. Please try again.";
}

/**
 * Handle general API errors
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
function handleGeneralError(error) {
  if (isNetworkError(error)) {
    return GENERAL_ERRORS.NETWORK;
  }

  const statusCode = getStatusCode(error);

  if (statusCode && GENERAL_ERRORS[statusCode]) {
    return GENERAL_ERRORS[statusCode];
  }

  return GENERAL_ERRORS.UNKNOWN;
}

/**
 * Main error handler function
 * Converts API errors into user-friendly messages based on context
 *
 * @param {Error} error - Axios error object
 * @param {string} context - Error context (use ErrorContext enum)
 * @returns {string} - User-friendly error message
 *
 * @example
 * try {
 *   await redeemPerk(perkId);
 * } catch (error) {
 *   const message = handleApiError(error, ErrorContext.REDEMPTION);
 *   toast.error(message);
 * }
 */
export function handleApiError(error, context = ErrorContext.GENERAL) {
  // Log original error for debugging
  console.error(`[${context}] API Error:`, error);

  // Route to appropriate handler based on context
  switch (context) {
    case ErrorContext.REDEMPTION:
      return handleRedemptionError(error);
    case ErrorContext.WALLET:
      return handleWalletError(error);
    case ErrorContext.ACHIEVEMENT:
      return handleAchievementError(error);
    case ErrorContext.AUTH:
      return handleGeneralError(error);
    case ErrorContext.PERK:
      return handleGeneralError(error);
    case ErrorContext.GENERAL:
    default:
      return handleGeneralError(error);
  }
}

/**
 * Legacy helper for backward compatibility
 * Extracts error message from API response
 * @deprecated Use handleApiError instead
 */
export function getErrorMessage(error) {
  return handleApiError(error, ErrorContext.GENERAL);
}

export default {
  handleApiError,
  getErrorMessage,
  ErrorContext,
};
