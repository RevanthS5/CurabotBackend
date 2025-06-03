const User = require("../models/User.js");

// ✅ Get User Profile (Protected)
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Update User Profile (Protected)
const updateUserProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        let user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Only allow users to update their own profiles OR admins to update anyone
        if (req.user.id !== user.id && req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden - Access Denied" });
        }

        // Update user fields
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;

        const updatedUser = await user.save();
        res.status(200).json({
            message: "User profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Error updating user profile:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Delete User Account (Protected, Admins or Self Only)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Only allow users to delete their own accounts OR admins to delete anyone
        if (req.user.id !== user.id && req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden - Access Denied" });
        }

        await user.deleteOne();
        res.status(200).json({ message: "User account deleted successfully" });

    } catch (error) {
        console.error("Error deleting user account:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getUserProfile, updateUserProfile, deleteUser };
