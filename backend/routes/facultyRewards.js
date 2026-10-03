const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const facultyRewardController = require("../controllers/facultyRewardController");

// All routes require authentication
router.use(verifyToken);

// POST /api/faculty-rewards (Faculty/Admin awards EDU tokens to student)
router.post(
  "/",
  requireRole("faculty", "admin"),
  facultyRewardController.createReward
);

// GET /api/faculty-rewards/student/me (Student views their own recognitions)
router.get("/student/me", facultyRewardController.getMyRewards);

// PATCH /api/faculty-rewards/:id/acknowledge (Student acknowledges reward)
router.patch("/:id/acknowledge", facultyRewardController.acknowledgeReward);

// POST /api/faculty-rewards/:id/acknowledge (Support POST as well)
router.post("/:id/acknowledge", facultyRewardController.acknowledgeReward);

// GET /api/faculty-rewards/faculty/me (Faculty views rewards they gave)
router.get(
  "/faculty/me",
  requireRole("faculty", "admin"),
  facultyRewardController.getFacultyAwardedRewards
);

// POST /api/faculty-rewards/:id/retry (Faculty/Admin retries failed tx)
router.post(
  "/:id/retry",
  requireRole("faculty", "admin"),
  facultyRewardController.retryReward
);

// GET /api/faculty-rewards/:id (Get single reward details)
router.get("/:id", facultyRewardController.getRewardById);

module.exports = router;
