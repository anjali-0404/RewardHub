const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const {
  createAchievement,
  getAchievements,
} = require("../controllers/achievementController");

// Admin/Faculty adds achievement (was previously unprotected)
router.post(
  "/",
  verifyToken,
  requireRole("faculty", "admin"),
  createAchievement
);

// Public read (students browse the catalog to submit claims)
router.get("/", getAchievements);

module.exports = router;
