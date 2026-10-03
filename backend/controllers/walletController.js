const User = require("../models/User");
const Redemption = require("../models/Redemption");
const blockchain = require("../blockchain/contract");
const { ethers } = require("ethers");
const crypto = require("crypto");

/**
 * Generate a nonce for wallet signature verification
 * POST /api/users/wallet/nonce
 * Protected route - requires authentication
 */
exports.generateNonce = async (req, res) => {
  try {
    // Generate unique nonce
    const nonce = `RewardHub Login: ${crypto.randomUUID()}`;

    // Save nonce to user document
    req.userDoc.walletNonce = nonce;
    await req.userDoc.save();

    res.json({
      nonce,
      msg: "Sign this nonce with your MetaMask wallet using personal_sign",
    });
  } catch (err) {
    console.error("Error generating nonce:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Verify wallet signature and connect wallet to user account
 * POST /api/users/wallet/verify
 * Body: { address, signature }
 * Protected route - requires authentication
 */
exports.verifyWallet = async (req, res) => {
  try {
    const { address, signature } = req.body;

    // Validate inputs
    if (!address || !signature) {
      return res
        .status(400)
        .json({ msg: "Missing required fields: address, signature" });
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ msg: "Invalid wallet address format" });
    }

    // Check if nonce exists
    if (!req.userDoc.walletNonce) {
      return res.status(400).json({
        msg: "No nonce found. Please request a nonce first using POST /api/users/wallet/nonce",
      });
    }

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(
        req.userDoc.walletNonce,
        signature
      );

      // Check if recovered address matches provided address
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(400).json({
          msg: "Signature verification failed: address mismatch",
          details:
            "The signature was not signed by the provided wallet address",
        });
      }

      // Update user with wallet information
      req.userDoc.walletAddress = address.toLowerCase();
      req.userDoc.walletConnected = true;
      req.userDoc.walletNonce = null; // Clear nonce after successful verification
      await req.userDoc.save();

      // If user is a student, register them on the blockchain
      if (req.userDoc.role === "student") {
        try {
          // Check if student is already registered on blockchain
          const isRegistered = await blockchain.isStudentRegistered(
            address.toLowerCase()
          );

          if (!isRegistered) {
            console.log(
              `Registering student ${req.userDoc.email} on blockchain...`
            );
            await blockchain.registerStudent(address.toLowerCase());
            console.log(
              `✅ Student ${req.userDoc.email} registered on blockchain`
            );
          } else {
            console.log(
              `Student ${req.userDoc.email} already registered on blockchain`
            );
          }
        } catch (blockchainErr) {
          console.error("Blockchain registration error:", blockchainErr);
          // Don't fail the wallet connection if blockchain registration fails
          // Just log the error - the wallet is still connected
        }
      }

      res.json({
        msg: "Wallet connected successfully",
        walletAddress: req.userDoc.walletAddress,
        walletConnected: true,
        user: {
          id: req.userDoc._id,
          email: req.userDoc.email,
          name: req.userDoc.name,
          role: req.userDoc.role,
          walletAddress: req.userDoc.walletAddress,
          walletConnected: req.userDoc.walletConnected,
        },
      });
    } catch (verifyErr) {
      console.error("Signature verification error:", verifyErr);
      return res.status(400).json({
        msg: "Signature verification failed",
        error: verifyErr.message,
      });
    }
  } catch (err) {
    console.error("Error in verifyWallet:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Disconnect wallet from user account
 * POST /api/users/wallet/disconnect
 * Protected route - requires authentication
 */
exports.disconnectWallet = async (req, res) => {
  try {
    req.userDoc.walletAddress = null;
    req.userDoc.walletConnected = false;
    req.userDoc.walletNonce = null;
    await req.userDoc.save();

    res.json({
      msg: "Wallet disconnected successfully",
      walletConnected: false,
      user: {
        id: req.userDoc._id,
        email: req.userDoc.email,
        name: req.userDoc.name,
        role: req.userDoc.role,
        walletAddress: null,
        walletConnected: false,
      },
    });
  } catch (err) {
    console.error("Error disconnecting wallet:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Get current wallet connection status
 * GET /api/users/wallet/status
 * Protected route - requires authentication
 */
exports.getWalletStatus = async (req, res) => {
  try {
    res.json({
      walletConnected: req.userDoc.walletConnected,
      walletAddress: req.userDoc.walletAddress,
    });
  } catch (err) {
    console.error("Error getting wallet status:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Get calculated token balance (blockchain + database fallback)
 * GET /api/users/wallet/calculated-balance
 * Protected route - requires authentication
 *
 * Never fails just because the chain is down: always returns the
 * database-computed balance so the frontend never gets stuck at 0.
 * Effective balance = max(chainAvailable, dbAvailable).
 */
exports.getCalculatedBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const StudentAchievement = require("../models/StudentAchievement");
    const FacultyReward = require("../models/FacultyReward");

    // ---- 1. DB earnings: confirmed achievements + confirmed faculty rewards ----
    const achievements = await StudentAchievement.find({
      studentId: userId,
      status: "confirmed",
    }).populate("achievementId", "tokenReward");

    const achEarned = achievements.reduce(
      (sum, a) => sum + (a.achievementId?.tokenReward || 0),
      0
    );

    const orFilter = [{ studentId: user._id }];
    if (user.walletAddress) {
      orFilter.push({ studentWallet: user.walletAddress.toLowerCase() });
    }
    const facultyRewards = await FacultyReward.find({
      $or: orFilter,
      transactionStatus: "confirmed",
    });

    // Deduplicate rewards already represented as a StudentAchievement
    // (facultyRewardController creates both rows with the same txHash)
    const achTxHashes = new Set(
      achievements.map((a) => a.txHash).filter(Boolean)
    );
    const nonOverlapping = facultyRewards.filter(
      (fr) => !fr.transactionHash || !achTxHashes.has(fr.transactionHash)
    );
    const facultyEarned = nonOverlapping.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );

    const totalEarned = achEarned + facultyEarned;

    // ---- 2. DB spending: all non-rejected redemptions ----
    const redemptions = await Redemption.find({
      studentId: userId,
      status: { $ne: "rejected" },
    }).populate("rewardId", "title tokenCost onChainCreated");

    const totalSpent = redemptions.reduce(
      (sum, r) => sum + (r.rewardId?.tokenCost || 0),
      0
    );
    const dbOnlySpent = redemptions
      .filter((r) => !r.rewardId?.onChainCreated)
      .reduce((sum, r) => sum + (r.rewardId?.tokenCost || 0), 0);
    const onChainSpent = totalSpent - dbOnlySpent;
    const dbAvailable = Math.max(0, totalEarned - totalSpent);

    // ---- 3. Blockchain balance (best effort, never fatal) ----
    let blockchainBalance = 0;
    let blockchainOk = false;
    let blockchainError = null;
    if (user.walletAddress) {
      try {
        const blockchainData = await blockchain.getTokenBalance(
          user.walletAddress
        );
        blockchainBalance =
          blockchainData && typeof blockchainData.human === "number"
            ? blockchainData.human
            : 0;
        blockchainOk = true;
      } catch (bcErr) {
        blockchainError = bcErr.message;
        console.warn(
          "Blockchain balance unavailable, using database fallback:",
          bcErr.message
        );
      }
    }

    // On-chain tokens minus off-chain (DB-only) spends, which never burned
    // on-chain, gives the true spendable on-chain amount.
    const chainAvailable = Math.max(0, blockchainBalance - dbOnlySpent);

    // Effective balance: trust whichever source is higher so a wiped /
    // unreachable chain never hides DB-verified earnings.
    const availableBalance = blockchainOk
      ? Math.max(chainAvailable, dbAvailable)
      : dbAvailable;

    res.json({
      blockchainBalance,
      blockchainOk,
      blockchainError,
      walletConnected: !!user.walletConnected,
      walletAddress: user.walletAddress,
      totalEarned,
      achievementEarned: achEarned,
      facultyEarned,
      totalSpent,
      blockchainRedemptions: onChainSpent,
      databaseRedemptions: dbOnlySpent,
      availableBalance,
      balanceSource: blockchainOk
        ? chainAvailable >= dbAvailable
          ? "blockchain"
          : "database"
        : "database",
      breakdown: {
        totalEarned,
        blockchainPerksRedeemed: onChainSpent,
        databasePerksRedeemed: dbOnlySpent,
      },
    });
  } catch (err) {
    console.error("Error calculating balance:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get unified transaction history (earnings + redemptions)
 * GET /api/users/wallet/transactions
 * Protected route - requires authentication
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const StudentAchievement = require("../models/StudentAchievement");
    const FacultyReward = require("../models/FacultyReward");

    const [achievements, facultyRewards, redemptions] = await Promise.all([
      StudentAchievement.find({ studentId: userId })
        .populate("achievementId", "title description tokenReward")
        .sort({ createdAt: -1 })
        .lean(),
      FacultyReward.find({
        $or: [
          { studentId: user._id },
          ...(user.walletAddress
            ? [{ studentWallet: user.walletAddress.toLowerCase() }]
            : []),
        ],
      })
        .sort({ timestamp: -1 })
        .lean(),
      Redemption.find({ studentId: userId })
        .populate("rewardId", "title description tokenCost")
        .sort({ date: -1 })
        .lean(),
    ]);

    const earned = [
      ...achievements.map((a) => ({
        kind: "achievement",
        id: a._id,
        title: a.achievementId?.title || "Achievement",
        amount: a.achievementId?.tokenReward || 0,
        status: a.status,
        txHash: a.txHash || null,
        date: a.dateAwarded || a.createdAt,
      })),
      ...facultyRewards.map((r) => ({
        kind: "faculty_reward",
        id: r._id,
        rewardId: r.rewardId,
        title: r.achievementReason,
        amount: r.amount || 0,
        status: r.transactionStatus,
        acknowledgementStatus: r.acknowledgementStatus,
        txHash: r.transactionHash || null,
        facultyName: r.facultyDetails?.name || "Faculty",
        date: r.timestamp || r.createdAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const spent = redemptions.map((r) => ({
      kind: "redemption",
      id: r._id,
      title: r.rewardId?.title || "Perk",
      amount: -(r.rewardId?.tokenCost || 0),
      status: r.status,
      txHash: r.txHash || null,
      date: r.date,
    }));

    const transactions = [...earned, ...spent].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const totalEarned = earned
      .filter((t) =>
        t.kind === "achievement"
          ? t.status === "confirmed"
          : t.status === "confirmed"
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSpent = redemptions
      .filter((r) => r.status !== "rejected")
      .reduce((sum, r) => sum + (r.rewardId?.tokenCost || 0), 0);

    res.json({
      count: transactions.length,
      totalEarned,
      totalSpent,
      available: Math.max(0, totalEarned - totalSpent),
      transactions,
      earned,
      spent,
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: err.message });
  }
};
