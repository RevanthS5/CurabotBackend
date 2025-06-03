const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    availableSlots: [{
        date: { type: Date, required: true },
        times: [{ 
            time: { type: String, required: true },  // Example: "14:00" (24-hour format)
            isBooked: { type: Boolean, default: false } // Marks if the slot is taken
        }]
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Schedule", ScheduleSchema);
