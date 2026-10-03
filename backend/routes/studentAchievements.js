const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const studentAchievementController = require("../controllers/studentAchievementController");
const StudentAchievement = require("../models/StudentAchievement");

// Alias verifyToken as requireAuth for consistency
const requireAuth = verifyToken;

// GET /api/student-achievements
router.get("/", requireAuth, studentAchievementController.getAllAchievements);

// GET /api/student-achievements/me (current user's achievements)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const studentId = req.userDoc._id;

    // Fetch achievements for the logged-in user
    const achievements = await StudentAchievement.find({ studentId })
      .populate("achievementId", "title description tokenReward")
      .populate("awardedBy", "name email role")
      .sort({ createdAt: -1 });

    // Calculate total tokens earned
    const totalTokens = achievements
      .filter((a) => a.status === "confirmed")
      .reduce((sum, a) => sum + (a.achievementId?.tokenReward || 0), 0);

    res.json({
      count: achievements.length,
      totalTokensEarned: totalTokens,
      achievements,
    });
  } catch (err) {
    console.error("Error in /me endpoint:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student-achievements (Faculty/Admin logs an achievement)
router.post(
  "/",
  requireAuth,
  requireRole("faculty", "admin"),
  studentAchievementController.logAchievement
);

// POST /api/student-achievements/claims (Student uploads an achievement claim)
router.post(
  "/claims",
  requireAuth,
  requireRole("student"),
  studentAchievementController.submitClaim
);

// GET /api/student-achievements/claims/pending (Faculty/Admin reviews queue)
router.get(
  "/claims/pending",
  requireAuth,
  requireRole("faculty", "admin"),
  studentAchievementController.getPendingClaims
);

// POST /api/student-achievements/claims/:id/review (Faculty/Admin approves|rejects)
router.post(
  "/claims/:id/review",
  requireAuth,
  requireRole("faculty", "admin"),
  studentAchievementController.reviewClaim
);

// GET /api/student-achievements/:id
router.get(
  "/:id",
  requireAuth,
  studentAchievementController.getAchievementById
);

// GET /api/student-achievements/student/:studentId
router.get(
  "/student/:studentId",
  requireAuth,
  studentAchievementController.getStudentAchievements
);

// DELETE /api/student-achievements/:id
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  studentAchievementController.deleteAchievement
);

module.exports = router;
