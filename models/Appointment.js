const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true }, 
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true }, 
    date: { type: Date, required: true }, 
    time: { type: String, required: true }, 
    chatSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", default: null }, // New field for chat session
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Appointment", AppointmentSchema);
