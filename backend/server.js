const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const achievementRoutes = require("./routes/achievements");
const studentAchievementRoutes = require("./routes/studentAchievements");
const rewardRoutes = require("./routes/rewards");
const redemptionRoutes = require("./routes/redemptions");
const blockchainRoutes = require("./routes/blockchain");
const adminRoutes = require("./routes/admin");
const walletRoutes = require("./routes/wallet");
const facultyRoutes = require("./routes/faculty");
const facultyRewardRoutes = require("./routes/facultyRewards");
require("dotenv").config();
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (hosting platforms + monitoring)
app.get("/api/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/student-achievements", studentAchievementRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/redemptions", redemptionRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users/wallet", walletRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/faculty-rewards", facultyRewardRoutes);

const frontendDistPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDistPath));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// Server Start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  await connectDB();
};

startServer();
