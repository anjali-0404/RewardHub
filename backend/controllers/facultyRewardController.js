const FacultyReward = require("../models/FacultyReward");
const StudentAchievement = require("../models/StudentAchievement");
const Achievement = require("../models/Achievement");
const User = require("../models/User");
const blockchain = require("../blockchain/contract");

/**
 * Escape user input before embedding it in a RegExp (prevents broken queries
 * when the reason contains characters like ( ) + * ? . etc.) and caps the
 * input length so a huge payload cannot mount a Regular Expression
 * Denial-of-Service against the database.
 */
function escapeRegExp(str) {
  const capped = String(str).slice(0, 200);
  return capped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate unique human-readable rewardId (e.g. REW-K92X-A81B)
 */
function generateRewardId() {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REW-${timePart}-${randPart}`;
}

/**
 * @route   POST /api/faculty-rewards
 * @desc    Faculty awards EDU tokens to a student for achievement/recognition
 * @access  Faculty, Admin
 */
exports.createReward = async (req, res) => {
  const { studentId, achievementReason, amount, note, achievementId } = req.body;

  try {
    // 1. Validate required fields
    if (!studentId) {
      return res.status(400).json({ msg: "Student is required" });
    }

    const eduAmount = parseFloat(amount);
    // The smart contract only supports whole tokens (amount * 1e18), so
    // fractional amounts would mint 0 on-chain while showing >0 in the DB.
    if (!Number.isInteger(eduAmount) || eduAmount <= 0) {
      return res.status(400).json({ msg: "EDU amount must be a whole number greater than 0" });
    }

    // Determine reason/title
    let finalReason = achievementReason ? achievementReason.trim() : "";
    if (!finalReason && achievementId) {
      const ach = await Achievement.findById(achievementId);
      if (ach) {
        finalReason = ach.title;
      }
    }

    if (!finalReason) {
      return res.status(400).json({ msg: "Achievement or reason is required" });
    }

    // 2. Validate student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    if (student.role !== "student") {
      return res.status(400).json({
        msg: "Recipient must be a student",
      });
    }

    // Check student wallet
    if (!student.walletAddress || !student.walletConnected) {
      return res.status(400).json({
        msg: "Student has not connected their wallet. Reward cannot be sent.",
        studentName: student.name,
        studentEmail: student.email,
        action: "student_must_connect_wallet",
      });
    }

    // 3. Validate faculty
    const facultyId = req.userDoc?._id || req.user?.id;
    const faculty = await User.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ msg: "Faculty user not found" });
    }

    // 4. Duplicate Prevention: Check identical reward in the last 60 seconds or pending
    const duplicateWindow = new Date(Date.now() - 60000);
    const existingDuplicate = await FacultyReward.findOne({
      studentId: student._id,
      facultyId: faculty._id,
      achievementReason: { $regex: new RegExp(`^${escapeRegExp(finalReason)}$`, "i") },
      amount: eduAmount,
      $or: [
        { createdAt: { $gte: duplicateWindow } },
        { transactionStatus: "pending" },
      ],
    });

    if (existingDuplicate) {
      return res.status(409).json({
        msg: "Duplicate reward detected. An identical recognition was just submitted for this student. Please check your recent awards.",
        duplicate: existingDuplicate,
      });
    }

    // 5. Generate unique rewardId
    let rewardId = generateRewardId();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const existing = await FacultyReward.findOne({ rewardId });
      if (!existing) {
        isUnique = true;
      } else {
        rewardId = generateRewardId();
        attempts++;
      }
    }

    // 6. Create permanent FacultyReward record with pending status
    const facultyDetails = {
      name: faculty.name,
      designation: faculty.designation || "Faculty Member",
      department: faculty.department || "Academic Department",
      email: faculty.email,
    };

    const newReward = await FacultyReward.create({
      rewardId,
      studentId: student._id,
      facultyId: faculty._id,
      studentWallet: student.walletAddress.toLowerCase(),
      facultyWallet: (faculty.walletAddress || "").toLowerCase(),
      facultyDetails,
      achievementReason: finalReason,
      note: note ? note.trim() : "",
      amount: eduAmount,
      timestamp: new Date(),
      transactionStatus: "pending",
      transactionHash: null,
      acknowledgementStatus: "pending",
      acknowledgementTimestamp: null,
    });

    // 7. Execute Blockchain Transaction
    try {
      console.log(
        `Initiating blockchain reward: ${eduAmount} EDU to ${student.walletAddress} for "${finalReason}" [${rewardId}]`
      );

      const txHash = await blockchain.rewardStudent(
        student.walletAddress,
        faculty.walletAddress || "",
        rewardId,
        finalReason,
        eduAmount
      );

      // Blockchain transaction confirmed!
      newReward.transactionHash = txHash;
      newReward.transactionStatus = "confirmed";

      // Also ensure StudentAchievement record exists for backward compatibility
      try {
        let achievementDoc = await Achievement.findOne({ title: finalReason });
        if (!achievementDoc) {
          achievementDoc = await Achievement.create({
            title: finalReason,
            description: note ? note.trim() : `Recognized for ${finalReason}`,
            tokenReward: eduAmount,
            createdBy: faculty._id,
            onChainCreated: true,
            onChainTx: txHash,
          });
        }

        const studentAch = await StudentAchievement.create({
          studentId: student._id,
          achievementId: achievementDoc._id,
          dateAwarded: new Date(),
          txHash: txHash,
          status: "confirmed",
          awardedBy: faculty._id,
        });

        newReward.studentAchievementId = studentAch._id;
      } catch (syncErr) {
        console.warn("Notice: StudentAchievement sync warning:", syncErr.message);
      }

      await newReward.save();

      return res.status(201).json({
        msg: "Faculty reward granted successfully and verified on blockchain!",
        reward: newReward,
        transactionHash: txHash,
      });
    } catch (blockchainErr) {
      console.error("Blockchain transaction failed:", blockchainErr);

      // Update record to failed
      newReward.transactionStatus = "failed";
      await newReward.save();

      return res.status(500).json({
        msg: "Reward recorded, but blockchain transaction failed. Please retry.",
        error: blockchainErr.message,
        reward: newReward,
      });
    }
  } catch (err) {
    console.error("Error in createReward:", err);
    return res.status(500).json({
      msg: "Server error while processing faculty reward",
      error: err.message,
    });
  }
};

/**
 * @route   GET /api/faculty-rewards/student/me
 * @desc    Get all faculty recognition rewards for logged-in student
 * @access  Student
 */
exports.getMyRewards = async (req, res) => {
  try {
    const studentId = req.userDoc?._id || req.user?.id;
    const { status, acknowledgementStatus } = req.query;

    const user = await User.findById(studentId);
    const filter = {
      $or: [
        { studentId },
        ...(user?.walletAddress ? [{ studentWallet: user.walletAddress.toLowerCase() }] : []),
      ],
    };
    if (status) filter.transactionStatus = status;
    if (acknowledgementStatus) filter.acknowledgementStatus = acknowledgementStatus;

    const rewards = await FacultyReward.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    // Calculate total verified tokens earned from faculty recognitions
    const totalTokensEarned = rewards
      .filter((r) => r.transactionStatus === "confirmed")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const pendingCount = rewards.filter((r) => r.acknowledgementStatus === "pending").length;

    res.json({
      count: rewards.length,
      totalTokensEarned,
      pendingAcknowledgementCount: pendingCount,
      rewards,
    });
  } catch (err) {
    console.error("Error in getMyRewards:", err);
    res.status(500).json({ msg: "Server error fetching rewards", error: err.message });
  }
};

/**
 * @route   PATCH /api/faculty-rewards/:id/acknowledge
 * @desc    Student acknowledges receipt of faculty reward
 * @access  Student (owner only)
 */
exports.acknowledgeReward = async (req, res) => {
  try {
    const studentId = (req.userDoc?._id || req.user?.id).toString();
    const { id } = req.params;

    // Find by _id or rewardId
    const query = id.startsWith("REW-") ? { rewardId: id } : { _id: id };
    const reward = await FacultyReward.findOne(query);

    if (!reward) {
      return res.status(404).json({ msg: "Reward record not found" });
    }

    // Verify ownership: only the recipient student can acknowledge
    if (reward.studentId.toString() !== studentId) {
      return res.status(403).json({
        msg: "Access denied. You can only acknowledge your own rewards.",
      });
    }

    // Students cannot edit reward details! Only update acknowledgement
    if (reward.acknowledgementStatus === "acknowledged") {
      return res.status(200).json({
        msg: "Reward is already acknowledged",
        reward,
      });
    }

    reward.acknowledgementStatus = "acknowledged";
    reward.acknowledgementTimestamp = new Date();
    await reward.save();

    res.json({
      msg: "Reward successfully acknowledged!",
      reward,
    });
  } catch (err) {
    console.error("Error acknowledging reward:", err);
    res.status(500).json({ msg: "Server error acknowledging reward", error: err.message });
  }
};

/**
 * @route   GET /api/faculty-rewards/faculty/me
 * @desc    Get all rewards awarded by logged-in faculty member
 * @access  Faculty
 */
exports.getFacultyAwardedRewards = async (req, res) => {
  try {
    const facultyId = req.userDoc?._id || req.user?.id;
    const { status, limit } = req.query;

    const filter = { facultyId };
    if (status) filter.transactionStatus = status;

    let query = FacultyReward.find(filter)
      .populate("studentId", "name email walletAddress")
      .sort({ timestamp: -1 });

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const rewards = await query.lean();

    res.json({
      count: rewards.length,
      rewards,
    });
  } catch (err) {
    console.error("Error fetching faculty awarded rewards:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * @route   GET /api/faculty-rewards/:id
 * @desc    Get single faculty reward by ID or rewardId
 * @access  Authenticated (Student own, Faculty creator, or Admin)
 */
exports.getRewardById = async (req, res) => {
  try {
    const userId = (req.userDoc?._id || req.user?.id).toString();
    const userRole = req.userDoc?.role || req.user?.role;
    const { id } = req.params;

    const query = id.startsWith("REW-") ? { rewardId: id } : { _id: id };
    const reward = await FacultyReward.findOne(query)
      .populate("studentId", "name email walletAddress")
      .populate("facultyId", "name email walletAddress designation department");

    if (!reward) {
      return res.status(404).json({ msg: "Reward record not found" });
    }

    // Access control
    if (userRole === "student" && reward.studentId._id.toString() !== userId) {
      return res.status(403).json({ msg: "Access denied" });
    }

    res.json(reward);
  } catch (err) {
    console.error("Error fetching reward by ID:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * @route   POST /api/faculty-rewards/:id/retry
 * @desc    Retry a failed blockchain transaction for a faculty reward
 * @access  Faculty (creator), Admin
 */
exports.retryReward = async (req, res) => {
  try {
    const userId = (req.userDoc?._id || req.user?.id).toString();
    const userRole = req.userDoc?.role || req.user?.role;
    const { id } = req.params;

    const query = id.startsWith("REW-") ? { rewardId: id } : { _id: id };
    const reward = await FacultyReward.findOne(query).populate(
      "studentId",
      "name email walletAddress walletConnected"
    );
    if (!reward) {
      return res.status(404).json({ msg: "Reward record not found" });
    }

    // Only creator faculty or admin can retry
    if (
      userRole !== "admin" &&
      reward.facultyId.toString() !== userId
    ) {
      return res.status(403).json({ msg: "Access denied" });
    }

    if (reward.transactionStatus === "confirmed") {
      return res.status(200).json({ msg: "Already confirmed", reward });
    }

    const student = reward.studentId;
    if (!student?.walletAddress) {
      return res.status(400).json({
        msg: "Student wallet not connected. Ask the student to connect their wallet first.",
      });
    }

    try {
      const txHash = await blockchain.rewardStudent(
        student.walletAddress,
        reward.facultyWallet || "",
        reward.rewardId,
        reward.achievementReason,
        reward.amount
      );
      reward.transactionHash = txHash;
      reward.transactionStatus = "confirmed";
      await reward.save();
      return res.json({
        msg: "Reward re-submitted and confirmed on blockchain!",
        reward,
        transactionHash: txHash,
      });
    } catch (blockchainErr) {
      reward.transactionStatus = "failed";
      await reward.save();
      return res.status(500).json({
        msg: "Retry failed: " + blockchainErr.message,
        error: blockchainErr.message,
        reward,
      });
    }
  } catch (err) {
    console.error("Error retrying reward:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
