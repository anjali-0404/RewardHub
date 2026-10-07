const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const {
  createReward,
  getAllRewards,
} = require("../controllers/rewardController");

// Admin/Faculty adds reward (was previously unprotected — anyone could
// mint 0-cost perks and drain the system)
router.post("/", verifyToken, requireRole("faculty", "admin"), createReward);

// Public catalog read (students need this to browse perks)
router.get("/", getAllRewards);

module.exports = router;
