const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware.js");
const { 
    addDoctor, 
    updateDoctor, 
    deleteDoctor 
} = require("../controllers/doctorController.js");

const { 
    getAdminDashboard, 
    getAllPatients, 
    getDoctorSchedule, 
    getAdminAnalytics, 
    manageAppointments, 
    manuallyScheduleAppointment 
} = require("../controllers/adminController.js");

const router = express.Router();

// ✅ Admin Dashboard Overview
router.get("/dashboard", protect, authorize("admin"), getAdminDashboard);

// ✅ Get All Patients
router.get("/patients", protect, authorize("admin"), getAllPatients);

// ✅ Doctor Management (Admin Only)
router.post("/doctors/add", protect, authorize("admin"), addDoctor);
router.patch("/doctors/update/:id", protect, authorize("admin"), updateDoctor);
router.delete("/doctors/delete/:id", protect, authorize("admin"), deleteDoctor);

// ✅ Doctor Schedule Visualization
router.get("/doctor-schedule/:doctorId", protect, authorize("admin"), getDoctorSchedule);

// ✅ AI-Based Admin Analytics
router.get("/analytics", protect, authorize("admin"), getAdminAnalytics);

// ✅ Manage Appointments (Reschedule/Cancel)
router.put("/appointments/:appointmentId", protect, authorize("admin"), manageAppointments);

// ✅ Manually Schedule an Appointment
router.post("/appointments/manual", protect, authorize("admin"), manuallyScheduleAppointment);

module.exports = router;
