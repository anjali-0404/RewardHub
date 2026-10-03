const mongoose = require("mongoose");

const studentAchievementSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Achievement",
    required: false,
    default: null,
  },
  dateAwarded: { type: Date, default: Date.now },
  txHash: { type: String }, // Will hold blockchain transaction hash
  status: {
    type: String,
    enum: [
      "pending_approval", // Student-submitted claim awaiting faculty review
      "pending_onchain",
      "confirmed",
      "failed",
      "rejected", // Faculty rejected the student's claim
    ],
    default: "pending_onchain",
  },
  awardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  note: { type: String, default: "" },
  amount: { type: Number, default: 0 },
  rewardId: { type: String, default: null },
  // ---- Student claim (upload) fields ----
  // True when this record originated from a student upload instead of a
  // direct faculty award.
  isClaim: { type: Boolean, default: false },
  // Custom title/description when the student claims something outside the
  // catalog (linked to an Achievement doc on approval).
  claimTitle: { type: String, default: "", trim: true },
  claimDescription: { type: String, default: "", trim: true },
  // Evidence supporting the claim (certificate URL, repo link, doc link...)
  evidenceUrl: { type: String, default: "", trim: true },
  // Faculty review outcome
  reviewNote: { type: String, default: "", trim: true },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  reviewedAt: { type: Date, default: null },
});

module.exports = mongoose.model("StudentAchievement", studentAchievementSchema);
