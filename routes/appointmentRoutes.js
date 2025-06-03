const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware.js");
const { bookAppointment, getAllAppointments, getPatientAppointments, cancelAppointment } = require("../controllers/appointmentController.js");

const router = express.Router();

// ✅ Book an Appointment (Patient Only)
router.post("/book", protect, authorize("patient"), bookAppointment);

// ✅ Get All Appointments (Admin & Doctor)
router.get("/all", protect, authorize("admin", "doctor"), getAllAppointments);

// ✅ Get Patient's Appointments (Patient Only)
router.get("/my", protect, authorize("patient"), getPatientAppointments);

// ✅ Cancel an Appointment (Patient/Admin)
router.patch("/cancel/:id", protect, cancelAppointment);

module.exports = router;
