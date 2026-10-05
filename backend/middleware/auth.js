const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getJwtSecret } = require("../config/auth");

/**
 * Middleware to verify JWT token and attach user data to request
 * Attaches both decoded token payload (req.user) and full User document (req.userDoc)
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        msg: "Access denied. No token provided or invalid format. Use 'Bearer <token>'" 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());
    
    // Attach decoded payload to request
    req.user = decoded;

    // Fetch full user document from database
    const userDoc = await User.findById(decoded.id).select("-password");
    
    if (!userDoc) {
      return res.status(401).json({ msg: "User not found. Token may be invalid." });
    }

    // Attach user document to request
    req.userDoc = userDoc;

    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ msg: "Invalid token" });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Token expired" });
    }
    if (err.message.includes("JWT_SECRET")) {
      return res.status(500).json({ msg: err.message });
    }
    return res.status(500).json({ msg: "Server error during authentication", error: err.message });
  }
};

module.exports = { verifyToken };
