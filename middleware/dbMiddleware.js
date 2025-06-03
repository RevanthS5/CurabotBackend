const connectDB = require('../config/db');

/**
 * Middleware to ensure database connection is established before processing requests
 * This is particularly important for serverless environments like Vercel
 */
const dbMiddleware = async (req, res, next) => {
  try {
    // Connect to the database (will use cached connection if available)
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error in middleware:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: Could not connect to database' 
    });
  }
};

module.exports = dbMiddleware;
