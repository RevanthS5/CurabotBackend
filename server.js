const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const dbMiddleware = require("./middleware/dbMiddleware");

console.log("🔍 Starting server initialization...");

// Load .env file
// In Docker, the .env file is in the app root directory
// In development, it's in the parent directory
const envPath = process.env.NODE_ENV === 'production' 
  ? path.resolve(__dirname, '.env')
  : path.resolve(__dirname, '../.env');

console.log("🔍 Loading .env from path:", envPath);

dotenv.config({ path: envPath });

console.log("🔍 Environment variables loaded. NODE_ENV:", process.env.NODE_ENV);

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors());

console.log("🔍 Express initialized with middleware");

// Apply database middleware to all API routes
app.use('/api', dbMiddleware);

// Load Routes
console.log("🔍 Setting up routes...");
app.use("/api/auth", require("./routes/authRoutes")); // Auth Routes
app.use("/api/admin", require("./routes/adminRoutes")); // Admin Routes
app.use("/api/doctors", require("./routes/doctorRoutes")); // Doctor Routes
app.use("/api/schedule", require("./routes/scheduleRoutes")); // Schedule appointment routes
app.use("/api/appointments", require("./routes/appointmentRoutes")); // All appointment routes
app.use("/api/ai/chatbot", require("./routes/chatbotRoutes")); // Chatbot Routes

console.log("🔍 Routes configured");

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, 'public')));

  // For any route that is not an API route, serve the index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).send('API endpoint not found');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
} else {
  // Default Route for development
  app.get("/", (req, res) => {
    console.log("🔍 Root route accessed");
    res.send("CuraBot Backend is Running using env!");
  });
}

// For local development, start the server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  console.log(`🔍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔍 MongoDB URI: ${process.env.MONGO_URI ? 'Set' : 'Not Set'}`);
  console.log(`🔍 GROQ API Key: ${process.env.GROQ_API_KEY ? 'Set' : 'Not Set'}`);
  console.log(`🔍 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not Set'}`);
  console.log(`🔍 Port: ${PORT}`);

  try {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Try accessing http://localhost:${PORT} in your browser`);
      console.log(`✅ Or try http://127.0.0.1:${PORT} instead of localhost`);
      console.log(`✅ For API testing, try http://localhost:${PORT}/api/auth/register`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
}

// For Vercel, export the Express app
module.exports = app;
