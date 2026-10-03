const mongoose = require("mongoose");

const facultyRewardSchema = new mongoose.Schema(
  {
    rewardId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentWallet: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    facultyWallet: {
      type: String,
      default: "",
      lowercase: true,
      index: true,
    },
    facultyDetails: {
      name: { type: String, required: true },
      designation: { type: String, default: "Faculty Member" },
      department: { type: String, default: "Academic Department" },
      email: { type: String, default: "" },
    },
    achievementReason: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    transactionHash: {
      type: String,
      default: null,
      index: true,
    },
    transactionStatus: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
      index: true,
    },
    acknowledgementStatus: {
      type: String,
      enum: ["pending", "acknowledged"],
      default: "pending",
      index: true,
    },
    acknowledgementTimestamp: {
      type: Date,
      default: null,
    },
    studentAchievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentAchievement",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FacultyReward", facultyRewardSchema);
