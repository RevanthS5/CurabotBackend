const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const { Groq } = require("groq-sdk");
const Appointment = require("../models/Appointment.js");
const Chat = require("../models/Chat.js");
const Doctor = require("../models/Doctor.js");
const User = require("../models/User.js");

// ✅ Add a New Doctor (Admin Only)
const addDoctor = async (req, res) => {
    try {
        const { userId, name, profilePic, speciality, qualification, overview, expertise } = req.body;

        // Check if the user exists and is a doctor
        const user = await User.findById(userId);
        if (!user || user.role !== "doctor") {
            return res.status(400).json({ message: "Invalid doctor user ID" });
        }

        const newDoctor = new Doctor({
            userId,
            name,
            profilePic,
            speciality,
            qualification,
            overview,
            expertise
        });

        await newDoctor.save();
        res.status(201).json({ message: "Doctor added successfully", doctor: newDoctor });
    } catch (error) {
        console.error("Error adding doctor:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Get All Doctors (Public)
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.status(200).json(doctors);
    } catch (error) {
        console.error("Error fetching doctors:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Get Doctor by ID (Public)
const getDoctorById = async (req, res) => {
    try {
        // Find doctor by userId instead of _id
        const doctor = await Doctor.findOne({ userId: req.params.id });
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        res.status(200).json(doctor);
    } catch (error) {
        console.error("Error fetching doctor:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Update Doctor Details (Admin Only)
const updateDoctor = async (req, res) => {
    try {
        const { name, profilePic, speciality, qualification, overview, expertise } = req.body;
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        doctor.name = name || doctor.name;
        doctor.profilePic = profilePic || doctor.profilePic;
        doctor.speciality = speciality || doctor.speciality;
        doctor.qualification = qualification || doctor.qualification;
        doctor.overview = overview || doctor.overview;
        doctor.expertise = expertise || doctor.expertise;

        await doctor.save();
        res.status(200).json({ message: "Doctor updated successfully", doctor });
    } catch (error) {
        console.error("Error updating doctor:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Delete Doctor (Admin Only)
const deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ message: "Doctor not found" });

        await doctor.deleteOne();
        res.status(200).json({ message: "Doctor deleted successfully" });
    } catch (error) {
        console.error("Error deleting doctor:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Initialize Groq Client
let groq;
try {
    groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });
    console.log("✅ Groq client initialized successfully for patient summary");
} catch (error) {
    console.error("❌ Failed to initialize Groq client:", error);
}

// ✅ Get Today's Appointments for Doctor
const getTodayAppointments = asyncHandler(async (req, res) => {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.user.id); // Ensure ObjectId type
        
        // Find the doctor document using userId
        const doctor = await Doctor.findOne({ userId: doctorId });
        
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found" });
        }
        
        // Get today's date (in local timezone)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get tomorrow's date (in local timezone)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        console.log("Doctor ID:", doctor._id);
        console.log("Querying for appointments between:", today, "and", tomorrow);
        
        // Use the doctor's _id field from the Doctor model
        const appointments = await Appointment.find({
            doctorId: doctor._id,
            date: {
                $gte: today,
                $lt: tomorrow
            }
        })
        .populate("patientId", "name email")
        .sort({ time: 1 });
        
        console.log("Found appointments:", appointments.length);
        
        res.status(200).json(appointments);
    } catch (error) {
        console.error("Error fetching doctor's appointments:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ✅ Get Appointments by Selected Date
const getAppointmentsByDate = asyncHandler(async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) return res.status(400).json({ message: "Date is required" });

        const userId = req.user.id; // Get user ID from authenticated user
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Find the doctor document using userId
        const doctor = await Doctor.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found" });
        }

        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        
        // Get next day
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        console.log("Doctor ID:", doctor._id);
        console.log("Querying for appointments on date:", selectedDate, "to", nextDay);

        const appointments = await Appointment.find({
            doctorId: doctor._id,
            date: { 
                $gte: selectedDate, 
                $lt: nextDay 
            }
        })
        .populate("patientId", "name email")
        .sort({ time: 1 });
        
        console.log("Found appointments:", appointments.length);

        res.status(200).json(appointments);
    } catch (error) {
        console.error("Error fetching doctor's appointments:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ✅ AI-Generated Patient Summary
const getPatientSummary = asyncHandler(async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        console.log(`Processing patient summary for appointment ID: ${appointmentId}`);
        
        // Validate appointmentId
        if (!appointmentId || appointmentId === ':appointmentId') {
            return res.status(400).json({ 
                message: "Invalid appointment ID. Please provide a valid appointment ID." 
            });
        }

        // Check if appointmentId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ 
                message: "Invalid appointment ID format. Please provide a valid MongoDB ObjectId." 
            });
        }

        // ✅ Fetch the appointment with populated patient details
        const appointment = await Appointment.findById(appointmentId)
            .populate("patientId", "name email _id");

        if (!appointment) {
            console.log(`Appointment not found for ID: ${appointmentId}`);
            return res.status(404).json({ message: "Appointment not found" });
        }
        
        // Get patient ID from the appointment
        const patientId = appointment.patientId._id;
        console.log(`Found appointment for patient: ${appointment.patientId.name} (ID: ${patientId})`);
        
        // ✅ Fetch chat history for this patient by matching patientId with userId in Chat collection
        console.log(`Looking for chat history with userId: ${patientId}`);
        const chatHistory = await Chat.findOne({ userId: patientId });
        
        if (!chatHistory) {
            console.log(`No chat history found for patient ID: ${patientId}`);
            return res.status(404).json({ message: "No chat history found for this patient" });
        }
        
        if (!chatHistory.messages || chatHistory.messages.length === 0) {
            console.log(`Chat history found but no messages for patient ID: ${patientId}`);
            return res.status(404).json({ message: "No chat messages found for this patient" });
        }
        
        console.log(`Found ${chatHistory.messages.length} chat messages for patient`);

        // Format chat messages for the AI prompt
        const formattedChatHistory = chatHistory.messages.map(msg => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.message
        }));

        // 🔥 Use Groq AI to summarize patient chat
        const prompt = `
        Patient Name: ${appointment.patientId.name}
        
        Based on the following chat history between a patient and a medical chatbot, 
        generate a structured summary of the patient's symptoms and concerns.
        
        Please return the response in the following JSON format:
        {
            "patientName": "${appointment.patientId.name}",
            "symptoms": ["symptom1", "symptom2", ...],
            "possibleDiagnosis": "potential diagnosis based on symptoms",
            "additionalNotes": "any other relevant information from the chat"
        }
        `;

        console.log(`Generating AI summary for patient: ${appointment.patientId.name}`);
        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: prompt },
                ...formattedChatHistory.slice(-10) // Use the last 10 messages to stay within token limits
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 1024,
            top_p: 0.9,
            response_format: { type: "json_object" }
        });

        let aiSummary;
        try {
            aiSummary = JSON.parse(response.choices[0].message.content);
            console.log(`Successfully generated AI summary for patient: ${appointment.patientId.name}`);
        } catch (parseError) {
            console.error("Error parsing AI response:", parseError);
            return res.status(500).json({ 
                message: "Error parsing AI response", 
                rawResponse: response.choices[0].message.content 
            });
        }

        res.status(200).json(aiSummary);
    } catch (error) {
        console.error("Error generating AI summary:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

module.exports = { addDoctor, getAllDoctors, getDoctorById, updateDoctor, deleteDoctor,getTodayAppointments, getAppointmentsByDate, getPatientSummary };
