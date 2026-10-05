const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isLocalhost) {
      if (
        envUrl &&
        (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))
      ) {
        console.warn(
          "⚠️ VITE_API_BASE_URL pointed to localhost on a live host. Falling back to '/api'."
        );
        return "/api";
      }
      return envUrl || "/api";
    }
  }

  if (envUrl && !envUrl.includes("localhost:5000") && envUrl !== "/api") {
    return envUrl;
  }
  return "/api";
};

export const API_BASE_URL = resolveApiBaseUrl();
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0xD1880b4a686fA011498ca415B703762B926bA99a";
export const BLOCKCHAIN_NETWORK =
  import.meta.env.VITE_BLOCKCHAIN_NETWORK || "sepolia";

export const USER_ROLES = {
  ADMIN: "admin",
  FACULTY: "faculty",
  STUDENT: "student",
};

export const ACHIEVEMENT_STATUS = {
  PENDING: "pending_onchain",
  CONFIRMED: "confirmed",
  FAILED: "failed",
};

export const REDEMPTION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user",
  USER_ROLE: "userRole",
};
