const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");

// Load .env file based on environment
const envPath = process.env.NODE_ENV === 'production' 
  ? path.resolve(__dirname, '../../.env')
  : path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

// ✅ Middleware to Protect Routes (Authentication Check)
const protect = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized - No Token Provided" });
  }

  try {
    // 🔑 Extract and verify token
    token = token.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🛠 Attach User Data to Request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized - Invalid Token" });
  }
};

// ✅ Middleware for Role-Based Access Control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden - Access Denied" });
    }
    next();
  };
};

module.exports = { protect, authorize };
