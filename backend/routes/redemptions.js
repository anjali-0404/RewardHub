const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { requireWallet } = require("../middleware/requireWallet");
const { requireRole } = require("../middleware/requireRole");
const {
  redeemReward,
  getRedemptionsByStudent,
  getAllRedemptions,
} = require("../controllers/redemptionController");

// Student redeems a reward (requires authentication and wallet connection)
router.post("/", verifyToken, requireWallet, redeemReward);

// View a student's redemptions (students: own only; faculty/admin: any)
router.get("/student/:studentId", verifyToken, getRedemptionsByStudent);

// Admin views all redemptions
router.get("/", verifyToken, requireRole("admin"), getAllRedemptions);

module.exports = router;
