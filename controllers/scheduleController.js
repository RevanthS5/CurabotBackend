const Schedule = require("../models/Schedule.js");
const Doctor = require("../models/Doctor.js");

// Helper function to generate time slots
const generateTimeSlots = (startTime, endTime, interval) => {
    let slots = [];
    let start = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]); // Convert to minutes
    let end = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]); 

    while (start < end) {
        let hours = Math.floor(start / 60);
        let minutes = start % 60;
        let formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        slots.push({ time: formattedTime, isBooked: false });
        start += interval; // Add interval (e.g., 30 min)
    }

    return slots;
};

// ✅ Set Doctor's Availability (Doctor Only)
const setDoctorAvailability = async (req, res) => {
    try {
        const { date, startTime, endTime, interval } = req.body;
        const doctorId = req.user.id;

        // Check if doctor exists
        const doctor = await Doctor.findOne({ userId: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found" });
        }

        const timeSlots = generateTimeSlots(startTime, endTime, interval);
        let schedule = await Schedule.findOne({ doctorId: doctor._id, "availableSlots.date": date });

        if (schedule) {
            schedule.availableSlots = schedule.availableSlots.map(slot =>
                slot.date.toISOString() === new Date(date).toISOString()
                    ? { date, times: timeSlots }
                    : slot
            );
        } else {
            schedule = new Schedule({ doctorId: doctor._id, availableSlots: [{ date, times: timeSlots }] });
        }

        await schedule.save();
        res.status(201).json({ message: "Doctor availability set successfully", schedule });
    } catch (error) {
        console.error("Error setting doctor availability:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Get Doctor's Availability (Patients & Admins)
const getDoctorAvailability = async (req, res) => {
    try {
        const schedule = await Schedule.findOne({ doctorId: req.params.doctorId });

        if (!schedule) return res.status(404).json({ message: "No schedule found for this doctor" });

        res.status(200).json(schedule);
    } catch (error) {
        console.error("Error fetching doctor availability:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Update Doctor's Availability (Doctor Only)
const updateDoctorAvailability = async (req, res) => {
    try {
        const { date, startTime, endTime, interval } = req.body;
        const doctorId = req.user.id;

        const doctor = await Doctor.findOne({ userId: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found" });
        }

        let schedule = await Schedule.findOne({ doctorId: doctor._id, "availableSlots.date": date });

        if (!schedule) {
            return res.status(404).json({ message: "No schedule found. Please set availability first." });
        }

        const newSlots = generateTimeSlots(startTime, endTime, interval);

        schedule.availableSlots = schedule.availableSlots.map(slot =>
            slot.date.toISOString() === new Date(date).toISOString()
                ? { date, times: newSlots }
                : slot
        );

        await schedule.save();

        res.status(200).json({ message: "Doctor availability updated successfully", schedule });
    } catch (error) {
        console.error("Error updating doctor availability:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { setDoctorAvailability, getDoctorAvailability, updateDoctorAvailability };
