const express = require("express");
const { chatbotResponse } = require("../controllers/chatbotController.js");

const router = express.Router();

// ✅ AI Chatbot API for Interactive Conversations
router.post("/", chatbotResponse);

module.exports = router;
