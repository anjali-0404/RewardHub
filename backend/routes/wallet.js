const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const walletController = require("../controllers/walletController");

// All wallet routes require authentication
router.use(verifyToken);

// @route   POST /api/users/wallet/nonce
// @desc    Generate nonce for wallet signature
// @access  Protected
router.post("/nonce", walletController.generateNonce);

// @route   POST /api/users/wallet/verify
// @desc    Verify wallet signature and connect wallet
// @access  Protected
router.post("/verify", walletController.verifyWallet);

// @route   POST /api/users/wallet/disconnect
// @desc    Disconnect wallet from account
// @access  Protected
router.post("/disconnect", walletController.disconnectWallet);

// @route   GET /api/users/wallet/calculated-balance
// @desc    Get calculated token balance (blockchain + database redemptions)
// @access  Protected
router.get("/calculated-balance", walletController.getCalculatedBalance);

// @route   GET /api/users/wallet/transactions
// @desc    Get unified transaction history (earnings + redemptions)
// @access  Protected
router.get("/transactions", walletController.getTransactions);

// @route   GET /api/users/wallet/status
// @desc    Get wallet connection status
// @access  Protected
router.get("/status", walletController.getWalletStatus);

module.exports = router;
