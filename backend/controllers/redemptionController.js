const Redemption = require("../models/Redemption");
const Reward = require("../models/Reward");
const StudentAchievement = require("../models/StudentAchievement");
const FacultyReward = require("../models/FacultyReward");
const User = require("../models/User");
const blockchain = require("../blockchain/contract");

// Get token balance from confirmed student achievements and confirmed faculty rewards.
// Only "confirmed" records have actually minted tokens on-chain, so pending/failed
// rows must NOT be counted (otherwise the UI shows tokens the student can't spend
// and on-chain redemption fails with "Not enough tokens").
const calculateTokenBalance = async (studentId, walletAddress) => {
  const totalAchievements = await StudentAchievement.find({
    studentId,
    status: "confirmed",
  }).populate("achievementId");

  const achEarned = totalAchievements.reduce(
    (sum, a) => sum + (a.achievementId?.tokenReward || 0),
    0
  );

  let facultyEarned = 0;
  if (walletAddress) {
    const facultyRewards = await FacultyReward.find({
      studentWallet: walletAddress.toLowerCase(),
      transactionStatus: "confirmed",
    });
    const nonOverlappingRewards = facultyRewards.filter(
      (fr) => !totalAchievements.some((a) => a.txHash && a.txHash === fr.transactionHash)
    );
    facultyEarned = nonOverlappingRewards.reduce((sum, r) => sum + (r.amount || 0), 0);
  }

  return achEarned + facultyEarned;
};

// Redeem a reward
exports.redeemReward = async (req, res) => {
  const { rewardId, walletAddress } = req.body;
  const studentId = req.user.id; // Get ID from authenticated user token

  try {
    const reward = await Reward.findById(rewardId);
    if (!reward) return res.status(404).json({ msg: "Reward not found" });

    const user = await User.findById(studentId);
    const effectiveWallet = walletAddress || user?.walletAddress;

    // Get all previous redemptions
    const redemptions = await Redemption.find({
      studentId,
      status: { $ne: "rejected" },
    }).populate("rewardId");

    const totalUsed = redemptions.reduce(
      (sum, r) => sum + (r.rewardId?.tokenCost || 0),
      0
    );

    // 1. Calculate from blockchain if wallet connected
    let blockchainBalance = 0;
    if (effectiveWallet) {
      try {
        const bcData = await blockchain.getTokenBalance(effectiveWallet);
        blockchainBalance = (bcData && typeof bcData.human === "number") ? bcData.human : 0;
      } catch (bcErr) {
        console.warn("Could not query blockchain balance during redemption:", bcErr.message);
      }
    }

    const databaseRedemptions = redemptions
      .filter((r) => !r.rewardId?.onChainCreated)
      .reduce((sum, r) => sum + (r.rewardId?.tokenCost || 0), 0);

    const availableOnChain = Math.max(0, blockchainBalance - databaseRedemptions);

    // 2. Calculate from database records
    const totalDbEarned = await calculateTokenBalance(studentId, effectiveWallet);
    const availableDb = Math.max(0, totalDbEarned - totalUsed);

    // Effective available tokens
    const available = Math.max(availableOnChain, availableDb);

    if (available < reward.tokenCost) {
      return res.status(400).json({
        msg: `Not enough tokens. You have ${available} tokens, but "${reward.title}" requires ${reward.tokenCost} tokens.`,
        available,
        required: reward.tokenCost,
      });
    }

    let txHash = null;

    // Only call blockchain if perk is synced on-chain
    if (reward.onChainCreated) {
      if (!effectiveWallet) {
        return res.status(400).json({
          msg: "Wallet address is required for on-chain perk redemption.",
        });
      }
      try {
        txHash = await blockchain.redeemPerk(effectiveWallet, reward.title);
        console.log(
          `✅ Perk "${reward.title}" redeemed on blockchain for ${effectiveWallet}: ${txHash}`
        );
      } catch (blockchainErr) {
        console.error("Blockchain redemption failed:", blockchainErr);
        return res.status(500).json({
          msg: "Blockchain redemption failed: " + blockchainErr.message,
          error: blockchainErr.message,
          hint: "This perk may not be synced to blockchain. Try redeeming a different perk.",
        });
      }
    } else {
      console.log(
        `⚠️ Perk "${reward.title}" not on blockchain - database-only redemption`
      );
    }

    // Save to DB
    const redemption = await Redemption.create({
      studentId,
      rewardId,
      txHash,
      status: "approved",
    });

    // Populate the reward details for response
    const populatedRedemption = await Redemption.findById(
      redemption._id
    ).populate("rewardId", "title description tokenCost");

    res.status(201).json({
      msg: "Perk redeemed successfully!",
      redemption: populatedRedemption,
      txHash,
      onChain: !!reward.onChainCreated,
    });
  } catch (err) {
    console.error("Error in redeemReward:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get student's redemptions
exports.getRedemptionsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate ObjectId format
    if (!studentId || studentId === "undefined" || studentId === "null") {
      return res.status(400).json({
        error: "Student ID is required",
      });
    }

    if (!require("mongoose").Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        error: "Invalid student ID format",
      });
    }

    const redemptions = await Redemption.find({
      studentId: studentId,
    })
      .populate("rewardId", "title description tokenCost")
      .sort({ date: -1 });

    console.log(
      `Found ${redemptions.length} redemptions for student ${studentId}`
    );
    res.json({ redemptions }); // Return as object with redemptions property
  } catch (err) {
    console.error("Error fetching redemptions:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all redemptions (for admin)
exports.getAllRedemptions = async (req, res) => {
  try {
    const redemptions = await Redemption.find()
      .populate("studentId")
      .populate("rewardId")
      .sort({ date: -1 });
    res.json(redemptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
