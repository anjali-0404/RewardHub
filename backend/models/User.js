const mongoose = require("mongoose");
const { ethers } = require("ethers");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "faculty", "admin"],
      default: "student",
    },
    walletAddress: { type: String, default: null },
    walletConnected: { type: Boolean, default: false },
    walletNonce: { type: String, default: null },
    designation: { type: String, default: "" },
    department: { type: String, default: "" },
  },
  { timestamps: true }
);

// Pre-save hook to validate and lowercase wallet address
userSchema.pre("save", function (next) {
  if (this.walletAddress) {
    // Validate wallet address format
    if (!ethers.isAddress(this.walletAddress)) {
      return next(new Error("Invalid wallet address format"));
    }
    // Lowercase the wallet address for consistency
    this.walletAddress = this.walletAddress.toLowerCase();
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
