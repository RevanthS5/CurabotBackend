const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

console.log(" DB Config: Initializing database connection...");

// Load .env file
// In Docker, the .env file is in the app root directory
// In development, it's in the parent directory
const envPath = process.env.NODE_ENV === 'production' 
  ? path.resolve(__dirname, '../../.env')
  : path.resolve(__dirname, "../.env");

console.log(" DB Config: Loading .env from path:", envPath);

dotenv.config({ path: envPath });

// Cache the database connection
let cachedConnection = null;

const connectDB = async () => {
  // If we have a cached connection, use it
  if (cachedConnection) {
    console.log(" DB Config: Using cached database connection");
    return cachedConnection;
  }

  try {
    console.log(" DB Config: Attempting to connect to MongoDB with URI:", 
      process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + "..." : "undefined");

    if (!process.env.MONGO_URI) {
      console.error(" DB Config: MONGO_URI is undefined. Check your .env file location and content.");
      process.exit(1);
    }

    // Set mongoose options for serverless environment
    mongoose.set('bufferCommands', false); // Disable mongoose buffering
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // These settings help with serverless environments
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(" MongoDB Connected to CuraBot Database...");
    console.log(" DB Config: Connection successful!");
    
    // Cache the connection
    cachedConnection = mongoose.connection;
    return cachedConnection;
  } catch (error) {
    console.error(" MongoDB Connection Error:", error.message);
    console.error(" DB Config: Full error:", error);
    
    // In serverless environment, don't exit the process
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    
    throw error; // Re-throw for handling in the route
  }
};

module.exports = connectDB;
