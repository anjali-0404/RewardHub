const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("❌ MongoDB Connection Failed: MONGO_URI is not defined.");
    console.error("   Please set MONGO_URI in your environment variables on Render.");
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("✅ MongoDB Connected");
    return true;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    console.error("   Troubleshooting:");
    console.error("   1. Verify MONGO_URI in Render environment variables.");
    console.error("   2. In MongoDB Atlas > Network Access, add IP 0.0.0.0/0 (Allow access from anywhere).");
    console.error("   3. Check your database username and password in the connection string.");
    return false;
  }
};

module.exports = connectDB;
