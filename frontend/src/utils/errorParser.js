/**
 * Parse backend API errors into user-friendly messages
 * @param {Error} error - The error object from axios/fetch
 * @returns {string} User-friendly error message
 */
export function parseApiError(error) {
  if (!error) {
    return "An unexpected error occurred. Please try again or contact support if the problem persists.";
  }

  // Handle direct string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle standard Error objects that have a custom message but no HTTP response (e.g. from service handlers)
  if (!error.response && error.message) {
    if (
      error.code === "ERR_NETWORK" ||
      error.message.includes("Network Error")
    ) {
      return "Unable to connect to the server. Please check your internet connection and try again.";
    }
    if (
      error.code === "ECONNABORTED" ||
      error.message.toLowerCase().includes("timeout")
    ) {
      return "The request took too long to complete. Please try again.";
    }
    // Return user-friendly message from service layer
    return error.message;
  }

  // Check if it's an axios error with response data
  if (error.response?.data) {
    const data = error.response.data;

    // Check for specific error actions/codes
    if (data.action === "student_must_connect_wallet") {
      return `${
        data.studentName || "This student"
      } needs to connect their wallet first. Please ask them to log in and connect MetaMask before awarding achievements.`;
    }

    // Check for common error messages and make them user-friendly
    if (data.msg) {
      const msg = data.msg;

      // Wallet-related errors
      if (msg.includes("wallet") || msg.includes("Wallet")) {
        if (msg.includes("not connected")) {
          return "The student has not connected their wallet yet. They need to connect MetaMask before receiving achievements.";
        }
      }

      // Already awarded
      if (
        msg.includes("already been awarded") ||
        msg.includes("already earned")
      ) {
        return "This achievement has already been awarded to this student.";
      }

      // Not found errors
      if (msg.includes("not found")) {
        if (msg.includes("Achievement")) {
          return "The selected achievement could not be found. Please refresh and try again.";
        }
        if (msg.includes("Student")) {
          return "The selected student could not be found. Please refresh and try again.";
        }
        return "The requested resource was not found. Please refresh and try again.";
      }

      // Insufficient balance
      if (msg.includes("not enough tokens") || msg.includes("insufficient") || msg.includes("Not enough tokens")) {
        return msg;
      }

      // Blockchain errors
      if (msg.includes("blockchain") || msg.includes("Blockchain")) {
        if (msg.includes("failed")) {
          return "There was a problem with the blockchain transaction. Please try again or contact support if the issue persists.";
        }
      }

      // Permission errors
      if (
        msg.includes("permission") ||
        msg.includes("authorized") ||
        msg.includes("Access denied")
      ) {
        return "You do not have permission to perform this action.";
      }

      // If we have a clean message, return it
      if (
        msg.length < 100 &&
        !msg.includes("Error:") &&
        !msg.includes("error:")
      ) {
        return msg;
      }
    }

    // Check for error field
    if (data.error) {
      const errorMsg = data.error;

      // Blockchain-specific errors
      if (errorMsg.includes("Gas estimation failed")) {
        return "Unable to process blockchain transaction. The student may not be registered on the blockchain yet.";
      }

      if (errorMsg.includes("revert")) {
        return "The blockchain transaction was rejected. Please ensure all requirements are met.";
      }

      // Clean up technical error messages
      if (errorMsg.length < 100 && !errorMsg.includes("Error:")) {
        return errorMsg;
      }
    }
  }

  // Handle network errors
  if (
    error.code === "ERR_NETWORK" ||
    error.message?.includes("Network Error")
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // Handle timeout errors
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return "The request took too long to complete. Please try again.";
  }

  // Handle status codes
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return "Invalid request. Please check your input and try again.";
      case 401:
        return "You are not logged in. Please log in and try again.";
      case 403:
        return "You do not have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 409:
        return "This action conflicts with existing data. Please refresh and try again.";
      case 500:
        return "A server error occurred. Please try again later or contact support.";
      case 503:
        return "The service is temporarily unavailable. Please try again later.";
    }
  }

  // Fallback to generic message
  return "An unexpected error occurred. Please try again or contact support if the problem persists.";
}

/**
 * Parse backend API success responses for user-friendly messages
 * @param {Object} response - The response object from axios
 * @returns {string} User-friendly success message
 */
export function parseApiSuccess(response) {
  if (response.data?.msg) {
    return response.data.msg;
  }

  if (response.data?.message) {
    return response.data.message;
  }

  return "Operation completed successfully!";
}
