const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    console.error("   Start MongoDB locally or update MONGO_URI in backend/.env.");
    process.exit(1);
  }
};

module.exports = connectDB;
