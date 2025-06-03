const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Links to patient
    messages: [
        {
            sender: { type: String, enum: ["user", "bot"], required: true },
            message: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatSchema);
