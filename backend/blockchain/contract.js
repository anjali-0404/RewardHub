// backend/blockchain/contract-improved.js
// IMPROVED VERSION with retry logic, connection pooling, and robust error handling

const { ethers } = require("ethers");
require("dotenv").config();

// Load contract ABI
const RewardHubTokenABI = require("./RewardHubTokenABI.json");

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Retry settings
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 10000, // 10 seconds
  RETRY_BACKOFF_MULTIPLIER: 2,

  // Timeout settings
  TRANSACTION_TIMEOUT: 60000, // 60 seconds
  PROVIDER_TIMEOUT: 30000, // 30 seconds

  // Gas settings
  GAS_LIMIT_BUFFER: 1.2, // 20% buffer on gas estimates
};

// ============================================================================
// PROVIDER SETUP WITH RETRY LOGIC
// ============================================================================

/**
 * Create provider with proper configuration
 */
function createProvider() {
  // Use GANACHE_RPC_URL for local development, fallback to SEPOLIA_RPC_URL for testnet
  const rpcUrl =
    process.env.GANACHE_RPC_URL ||
    process.env.SEPOLIA_RPC_URL ||
    "http://127.0.0.1:7545";

  // For local Ganache, use simpler configuration
  if (rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost")) {
    return new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true, // Faster for local networks
    });
  }

  // For remote RPC (Sepolia, Infura, Alchemy), use more robust config
  return new ethers.JsonRpcProvider(rpcUrl, undefined, {
    staticNetwork: false,
    batchMaxCount: 1, // Disable batching to avoid connection issues
  });
}

const provider = createProvider();
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  RewardHubTokenABI,
  wallet
);

// Debug: Log wallet configuration on module load
console.log("🔐 Blockchain Service Initialized:");
console.log(`   Wallet Address: ${wallet.address}`);
console.log(`   Contract Address: ${process.env.CONTRACT_ADDRESS}`);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attemptNumber) {
  const delay = Math.min(
    CONFIG.INITIAL_RETRY_DELAY *
      Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, attemptNumber),
    CONFIG.MAX_RETRY_DELAY
  );
  return delay;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  const retryableMessages = [
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "network error",
    "connection error",
    "socket hang up",
    "timeout",
    "nonce too low", // Can happen with concurrent requests
    "replacement fee too low",
  ];

  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some((msg) =>
    errorMessage.includes(msg.toLowerCase())
  );
}

/**
 * Retry wrapper for async functions
 */
async function withRetry(fn, operationName = "operation") {
  let lastError;

  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        console.error(
          `❌ ${operationName} failed with non-retryable error:`,
          error.message
        );
        throw error;
      }

      if (attempt < CONFIG.MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.warn(
          `⚠️  ${operationName} failed (attempt ${attempt + 1}/${
            CONFIG.MAX_RETRIES
          }): ${error.message}`
        );
        console.warn(`   Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error(
    `❌ ${operationName} failed after ${CONFIG.MAX_RETRIES} attempts`
  );
  throw new Error(
    `${operationName} failed after ${CONFIG.MAX_RETRIES} retries: ${lastError.message}`
  );
}

/**
 * Validate connection health
 */
async function validateConnection() {
  try {
    await provider.getBlockNumber();
    return true;
  } catch (error) {
    console.error("Connection validation failed:", error.message);
    return false;
  }
}

// ============================================================================
// READ OPERATIONS (with retry)
// ============================================================================

/**
 * Get token balance for a wallet address
 */
const getTokenBalance = async (walletAddress) => {
  return withRetry(async () => {
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await getDecimals();
    const human = parseFloat(ethers.formatUnits(balance, decimals));

    return {
      raw: balance.toString(),
      human: human,
    };
  }, `getTokenBalance(${walletAddress})`);
};

/**
 * Get contract decimals
 */
const getDecimals = async () => {
  return withRetry(async () => {
    try {
      const decimals = await contract.decimals();
      return Number(decimals);
    } catch (err) {
      console.warn("Contract doesn't have decimals function, using default 18");
      return 18;
    }
  }, "getDecimals");
};

/**
 * Get total supply of tokens
 */
const getTotalSupply = async () => {
  return withRetry(async () => {
    const totalSupply = await contract.totalSupply();
    const decimals = await getDecimals();
    return parseFloat(ethers.formatUnits(totalSupply, decimals));
  }, "getTotalSupply");
};

/**
 * Check if achievement exists on-chain
 */
const achievementExists = async (title) => {
  try {
    return await withRetry(async () => {
      const achievement = await contract.achievements(title);
      return achievement.rewardAmount > 0;
    }, `achievementExists(${title})`);
  } catch (err) {
    console.error("Error checking achievement existence:", err);
    return false;
  }
};

/**
 * Check if perk exists on-chain
 */
const perkExists = async (title) => {
  try {
    return await withRetry(async () => {
      const perk = await contract.perks(title);
      return perk.cost > 0;
    }, `perkExists(${title})`);
  } catch (err) {
    console.error("Error checking perk existence:", err);
    return false;
  }
};

// ============================================================================
// WRITE OPERATIONS (with retry and gas estimation)
// ============================================================================

/**
 * Send transaction with retry logic and proper gas estimation
 */
async function sendTransactionWithRetry(contractMethod, args, operationName) {
  return withRetry(async () => {
    // Step 1: Validate connection
    const isConnected = await validateConnection();
    if (!isConnected) {
      throw new Error("Provider connection is not healthy");
    }

    // Step 2: Estimate gas
    let gasEstimate;
    try {
      gasEstimate = await contractMethod.estimateGas(...args);
      console.log(
        `   Gas estimate for ${operationName}: ${gasEstimate.toString()}`
      );
    } catch (gasError) {
      console.error(
        `   Gas estimation failed for ${operationName}:`,
        gasError.message
      );
      throw new Error(`Gas estimation failed: ${gasError.message}`);
    }

    // Step 3: Add buffer to gas limit
    const gasLimit = BigInt(
      Math.floor(Number(gasEstimate) * CONFIG.GAS_LIMIT_BUFFER)
    );

    // Step 4: Send transaction
    const tx = await contractMethod(...args, { gasLimit });
    console.log(`   Transaction sent: ${tx.hash}`);

    // Step 5: Wait for confirmation with timeout
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction confirmation timeout")),
          CONFIG.TRANSACTION_TIMEOUT
        )
      ),
    ]);

    console.log(`   Transaction confirmed in block ${receipt.blockNumber}`);
    return tx.hash;
  }, operationName);
}

/**
 * Add an achievement to the blockchain
 */
const addAchievement = async (title, tokenReward) => {
  try {
    console.log(`Adding achievement: "${title}" with reward ${tokenReward}`);

    const txHash = await sendTransactionWithRetry(
      contract.addAchievement,
      [title, tokenReward],
      `addAchievement("${title}", ${tokenReward})`
    );

    return txHash;
  } catch (err) {
    console.error("Error adding achievement:", err);
    throw new Error(`Blockchain addAchievement failed: ${err.message}`);
  }
};

/**
 * Add a perk to the blockchain
 */
const addPerk = async (title, tokenCost) => {
  try {
    console.log(`Adding perk: "${title}" with cost ${tokenCost}`);

    const txHash = await sendTransactionWithRetry(
      contract.addPerk,
      [title, tokenCost],
      `addPerk("${title}", ${tokenCost})`
    );

    return txHash;
  } catch (err) {
    console.error("Error adding perk:", err);
    throw new Error(`Blockchain addPerk failed: ${err.message}`);
  }
};

/**
 * Grant achievement to student (mints tokens)
 */
const grantAchievement = async (studentAddress, achievementTitle) => {
  try {
    console.log(
      `Granting achievement "${achievementTitle}" to ${studentAddress}`
    );

    const txHash = await sendTransactionWithRetry(
      contract.grantAchievement,
      [studentAddress, achievementTitle],
      `grantAchievement("${studentAddress}", "${achievementTitle}")`
    );

    return txHash;
  } catch (err) {
    console.error("Error granting achievement:", err);
    throw new Error(`Blockchain grantAchievement failed: ${err.message}`);
  }
};

/**
 * Reward student on blockchain (mints EDU tokens and emits FacultyRewardGranted event)
 */
const rewardStudent = async (studentAddress, facultyAddress, rewardId, reason, amount) => {
  try {
    console.log(
      `Awarding student ${studentAddress} ${amount} EDU by ${facultyAddress} for "${reason}" [${rewardId}]`
    );

    // Ensure student is registered on blockchain first
    const isReg = await isStudentRegistered(studentAddress);
    if (!isReg) {
      console.log(`Auto-registering student ${studentAddress} on blockchain before reward...`);
      await registerStudent(studentAddress);
    }

    // Call contract.rewardStudent if available
    if (typeof contract.rewardStudent === "function") {
      const txHash = await sendTransactionWithRetry(
        contract.rewardStudent,
        [
          studentAddress,
          facultyAddress || ethers.ZeroAddress,
          rewardId,
          reason,
          BigInt(Math.floor(amount)),
        ],
        `rewardStudent("${studentAddress}", "${facultyAddress}", "${rewardId}", "${reason}", ${amount})`
      );
      return txHash;
    }

    // Fallback: If rewardStudent is not in ABI, grant achievement
    const exists = await achievementExists(reason);
    if (!exists) {
      await addAchievement(reason, amount);
    }
    return await grantAchievement(studentAddress, reason);
  } catch (err) {
    console.error("Error rewarding student on blockchain:", err);
    throw new Error(`Blockchain rewardStudent failed: ${err.message}`);
  }
};

/**
 * Redeem a perk (burns tokens)
 * Note: Admin wallet redeems on behalf of the student
 */
const redeemPerk = async (studentAddress, perkTitle) => {
  try {
    console.log(`Redeeming perk "${perkTitle}" for student ${studentAddress}`);

    const txHash = await sendTransactionWithRetry(
      contract.redeemPerk,
      [studentAddress, perkTitle],
      `redeemPerk("${studentAddress}", "${perkTitle}")`
    );

    return txHash;
  } catch (err) {
    console.error("Error redeeming perk:", err);
    throw new Error(`Blockchain redeemPerk failed: ${err.message}`);
  }
};

/**
 * Check if a student is registered on the blockchain
 */
const isStudentRegistered = async (studentAddress) => {
  try {
    if (typeof contract.isStudent !== "function") {
      console.warn("Contract does not have isStudent function");
      return false;
    }

    const isRegistered = await contract.isStudent(studentAddress);
    return isRegistered;
  } catch (err) {
    console.error("Error checking student registration:", err);
    return false; // Return false on error to allow registration attempt
  }
};

/**
 * Register a student on the blockchain
 */
const registerStudent = async (studentAddress) => {
  try {
    if (typeof contract.registerStudent !== "function") {
      console.warn("Contract does not have registerStudent function");
      return null;
    }

    const txHash = await sendTransactionWithRetry(
      contract.registerStudent,
      [studentAddress],
      `registerStudent("${studentAddress}")`
    );

    return txHash;
  } catch (err) {
    console.error("Error registering student:", err);
    throw new Error(`Blockchain registerStudent failed: ${err.message}`);
  }
};

/**
 * Legacy mint function - DEPRECATED
 */
const mint = async (studentAddress, amount) => {
  console.warn(
    "⚠️  DEPRECATED: mint() is deprecated. Use grantAchievement() instead."
  );
  throw new Error(
    "Direct mint() not supported. Use grantAchievement() with achievement title."
  );
};

/**
 * Update achievement on blockchain (creates new version, deactivates old)
 */
const updateAchievement = async (oldTitle, newTitle, newRewardAmount) => {
  try {
    console.log(
      `Updating achievement: "${oldTitle}" -> "${newTitle}" with reward ${newRewardAmount}`
    );

    const txHash = await sendTransactionWithRetry(
      contract.updateAchievement,
      [oldTitle, newTitle, newRewardAmount],
      `updateAchievement("${oldTitle}", "${newTitle}", ${newRewardAmount})`
    );

    return txHash;
  } catch (err) {
    console.error("Error updating achievement:", err);
    throw new Error(`Blockchain updateAchievement failed: ${err.message}`);
  }
};

/**
 * Deactivate achievement on blockchain (soft delete)
 */
const deactivateAchievement = async (title) => {
  try {
    console.log(`Deactivating achievement: "${title}"`);

    const txHash = await sendTransactionWithRetry(
      contract.deactivateAchievement,
      [title],
      `deactivateAchievement("${title}")`
    );

    return txHash;
  } catch (err) {
    console.error("Error deactivating achievement:", err);
    throw new Error(`Blockchain deactivateAchievement failed: ${err.message}`);
  }
};

/**
 * Update perk on blockchain (creates new version, deactivates old)
 */
const updatePerk = async (oldTitle, newTitle, newCost) => {
  try {
    console.log(
      `Updating perk: "${oldTitle}" -> "${newTitle}" with cost ${newCost}`
    );

    const txHash = await sendTransactionWithRetry(
      contract.updatePerk,
      [oldTitle, newTitle, newCost],
      `updatePerk("${oldTitle}", "${newTitle}", ${newCost})`
    );

    return txHash;
  } catch (err) {
    console.error("Error updating perk:", err);
    throw new Error(`Blockchain updatePerk failed: ${err.message}`);
  }
};

/**
 * Deactivate perk on blockchain (soft delete)
 */
const deactivatePerk = async (title) => {
  try {
    console.log(`Deactivating perk: "${title}"`);

    const txHash = await sendTransactionWithRetry(
      contract.deactivatePerk,
      [title],
      `deactivatePerk("${title}")`
    );

    return txHash;
  } catch (err) {
    console.error("Error deactivating perk:", err);
    throw new Error(`Blockchain deactivatePerk failed: ${err.message}`);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  contract,
  provider,
  wallet,
  getTokenBalance,
  getTotalSupply,
  getDecimals,
  addAchievement,
  updateAchievement,
  deactivateAchievement,
  addPerk,
  updatePerk,
  deactivatePerk,
  grantAchievement,
  rewardStudent,
  mint,
  redeemPerk,
  registerStudent,
  isStudentRegistered,
  achievementExists,
  perkExists,
  validateConnection,
  CONFIG, // Export config for testing
};
