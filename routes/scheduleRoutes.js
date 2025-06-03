const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware.js");
const { setDoctorAvailability, getDoctorAvailability, updateDoctorAvailability } = require("../controllers/scheduleController.js");

const router = express.Router();

// ✅ Set Doctor's Availability (Doctor Only)
router.post("/", protect, authorize("doctor"), setDoctorAvailability);

// ✅ Get Doctor's Availability (Public)
router.get("/:doctorId", getDoctorAvailability);

// ✅ Update Doctor's Availability (Doctor Only)
router.patch("/", protect, authorize("doctor"), updateDoctorAvailability);

module.exports = router;
