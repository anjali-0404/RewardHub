const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register
exports.registerUser = async (req, res) => {
  const { name, email, password, role, walletAddress } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      walletAddress,
    });

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -walletNonce"
    );
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Update current user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, walletAddress, designation, department } = req.body;

    // Validation
    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ msg: "Name must be at least 2 characters" });
    }

    if (name.trim().length > 100) {
      return res
        .status(400)
        .json({ msg: "Name must be less than 100 characters" });
    }

    // Prepare update object with only editable fields
    const updateData = {
      name: name.trim(),
    };

    if (designation !== undefined) {
      updateData.designation = designation ? designation.trim() : "";
    }
    if (department !== undefined) {
      updateData.department = department ? department.trim() : "";
    }

    // Validate wallet address if provided
    if (
      walletAddress !== undefined &&
      walletAddress !== null &&
      walletAddress !== ""
    ) {
      const { ethers } = require("ethers");
      if (!ethers.isAddress(walletAddress)) {
        return res
          .status(400)
          .json({ msg: "Invalid Ethereum wallet address format" });
      }
      updateData.walletAddress = walletAddress.toLowerCase();
    } else if (walletAddress === "") {
      // Allow clearing the wallet address
      updateData.walletAddress = null;
    }

    // Update user (only editable fields)
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -walletNonce");

    if (!updatedUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      msg: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res
      .status(500)
      .json({ msg: "Failed to update profile", error: err.message });
  }
};
