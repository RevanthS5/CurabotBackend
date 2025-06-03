const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Links to Users Collection
    name: { type: String, required: true },
    profilePic: { type: String, required: false }, // Optional field for profile picture
    speciality: { type: String, required: true },
    qualification: { type: String, required: true },
    overview: { type: String, required: true },
    expertise: { type: [String], required: true }, // Array of expertise areas
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Doctor", DoctorSchema);
