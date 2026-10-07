const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");

/**
 * Admin-only endpoint to register new users
 * POST /api/admin/users
 * Body: { name, email, password, role, walletAddress (optional) }
 */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        msg: "Missing required fields: name, email, password, role" 
      });
    }

    // Validate role
    const validRoles = ["student", "faculty", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        msg: `Invalid role. Must be one of: ${validRoles.join(", ")}` 
      });
    }

    // Check if user already exists (case-insensitive on normalized email)
    const normalizedEmail = String(email).toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ msg: "User with this email already exists" });
    }

    // Validate wallet address if provided
    if (walletAddress && !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ msg: "Invalid wallet address format" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      walletAddress: walletAddress || null,
      walletConnected: !!walletAddress,
      walletNonce: null,
    });

    // Return user without password
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
      walletConnected: user.walletConnected,
      createdAt: user.createdAt,
    };

    res.status(201).json({ 
      msg: "User registered successfully",
      user: userResponse 
    });
  } catch (err) {
    console.error("Error in admin registerUser:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Admin endpoint to list all users
 * GET /api/admin/users
 */
exports.listUsers = async (req, res) => {
  try {
    const { role, walletConnected, page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (walletConnected !== undefined) filter.walletConnected = walletConnected === "true";

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select("-password -walletNonce")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error in admin listUsers:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Admin endpoint to update a user
 * PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, walletAddress } = req.body;

    // Find user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = String(email).toLowerCase().trim();
    if (role) {
      const validRoles = ["student", "faculty", "admin"];
      if (!validRoles.includes(role)) {
        return res
          .status(400)
          .json({ msg: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
      }
      user.role = role;
    }
    
    // Handle wallet address update carefully
    if (walletAddress !== undefined) {
      if (walletAddress && !ethers.isAddress(walletAddress)) {
        return res.status(400).json({ msg: "Invalid wallet address format" });
      }
      user.walletAddress = walletAddress || null;
      user.walletConnected = !!walletAddress;
    }

    await user.save();

    res.json({
      msg: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        walletConnected: user.walletConnected
      }
    });
  } catch (err) {
    console.error("Error in admin updateUser:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Admin endpoint to delete a user
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Prevent deleting self (optional but good practice)
    if (user._id.toString() === req.user.id) {
       return res.status(400).json({ msg: "Cannot delete your own admin account" });
    }

  await User.findByIdAndDelete(req.params.id);

    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("Error in admin deleteUser:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * Faculty/Admin endpoint to list students only
 * GET /api/admin/students
 * Accessible by faculty and admin for awarding achievements
 */
exports.listStudents = async (req, res) => {
  try {
    const { walletConnected, page = 1, limit = 50 } = req.query;

    // Build filter - only students
    const filter = { role: "student" };
    if (walletConnected !== undefined) filter.walletConnected = walletConnected === "true";

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const students = await User.find(filter)
      .select("-password -walletNonce")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error in listStudents:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
