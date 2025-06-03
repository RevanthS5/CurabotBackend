const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware.js");
const { 
    getAllDoctors, 
    getDoctorById, 
    getTodayAppointments, 
    getAppointmentsByDate, 
    getPatientSummary 
} = require("../controllers/doctorController.js");

const router = express.Router();

// ✅ Public Routes
router.get("/", getAllDoctors); // Get all doctors (Public)
router.get("/:id", getDoctorById); // Get doctor by ID (Public)

// ✅ Doctor Dashboard Routes (Doctor Only)
router.get("/appointments/today", protect, authorize("doctor"), getTodayAppointments); // View today's appointments
router.get("/appointments", protect, authorize("doctor"), getAppointmentsByDate); // View appointments by date

// ✅ AI-Generated Patient Summary for Doctors
router.get("/appointment/:appointmentId/patient-summary", protect, authorize("doctor"), getPatientSummary);

module.exports = router;
