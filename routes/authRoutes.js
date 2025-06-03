const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController.js");
const { getUserProfile, updateUserProfile, deleteUser } = require("../controllers/userController.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

// ✅ User Registration Route
router.post("/register", registerUser);

// ✅ User Login Route
router.post("/login", loginUser);

// ✅ Get Logged-in User Profile
router.get("/me", protect, (req, res) => {
  res.json({ message: "User authorized", user: req.user });
});

// ✅ Get User Profile by ID
router.get("/profile/:userId", protect, getUserProfile);

// ✅ Update User Profile
router.patch("/update/:userId", protect, updateUserProfile);

// ✅ Delete User Account
router.delete("/delete/:userId", protect, deleteUser);

module.exports = router;
