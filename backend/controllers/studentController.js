const User = require("../models/User");
const blockchain = require("../blockchain/contract");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");

exports.registerStudentOnChain = async (req, res) => {
  const { name, email, password, walletAddress, signature, message } = req.body;

  try {
    // 1. Validate required fields
    if (!name || !email || !password || !walletAddress || !signature || !message) {
      return res.status(400).json({
        msg: "Missing required fields: name, email, password, walletAddress, signature, message",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ msg: "Password must be at least 8 characters" });
    }

    // 2. Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ msg: "Invalid wallet address format" });
    }
    const normalizedWallet = walletAddress.toLowerCase();

    // 3. Reject a wallet already bound to another account
    const walletInUse = await User.findOne({
      walletAddress: normalizedWallet,
      walletConnected: true,
    });
    if (walletInUse) {
      return res.status(409).json({
        msg: "This wallet is already connected to another account. Please use a different wallet.",
      });
    }

    // 4. Verify wallet signature binds the signed message to this wallet
    const recoveredAddress = ethers.verifyMessage(String(message), signature);
    if (recoveredAddress.toLowerCase() !== normalizedWallet) {
      return res.status(403).json({ msg: "Wallet signature verification failed" });
    }
    if (!String(message).includes("RewardHub")) {
      return res.status(403).json({
        msg: "Signed message must include the RewardHub challenge text",
      });
    }

    // 5. Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: "Student already registered" });
    }

    // 6. Register the wallet on-chain
    let txHash;
    try {
      txHash = await blockchain.registerStudent(normalizedWallet);
    } catch (bcErr) {
      console.error("Blockchain registration failed:", bcErr.message);
      return res.status(502).json({
        msg: "Blockchain registration failed. Account was not created.",
        error: bcErr.message,
      });
    }

    // 7. Save to DB with a properly hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      walletAddress: normalizedWallet,
      walletConnected: true,
      walletNonce: null,
    });

    res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        walletAddress: newUser.walletAddress,
        walletConnected: newUser.walletConnected,
      },
      txHash,
    });
  } catch (err) {
    console.error("Error in registerStudentOnChain:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
