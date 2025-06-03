const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Use PBKDF2
const dotenv = require("dotenv");
const path = require("path");

// Load .env file based on environment
const envPath = process.env.NODE_ENV === 'production' 
  ? path.resolve(__dirname, '../../.env')
  : path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

// ✅ User Registration Function
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // 🔍 Check if user already exists
        let userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // 🏆 Generate a salt and hash the password using PBKDF2
        const salt = crypto.randomBytes(16).toString("hex");
        const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

        console.log("🔒 PBKDF2 Hashed Password:", hashedPassword);

        // ✅ Only allow role assignment if the user is an admin
        const userRole = req.user?.role === "admin" ? role : "patient";

        // 📝 Create new user
        const user = new User({
            name,
            email,
            phone,
            password: `${salt}:${hashedPassword}`,
            role: userRole,
        });

        await user.save();
        console.log("✅ User registered successfully!");

        // 🎟 Generate JWT Token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });

    } catch (error) {
        console.error("❌ Registration Error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};



  

// ✅ User Login Function
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        console.log("🔑 Stored User from DB:", user);

        // 🏆 Extract salt and hash from stored password
        const [salt, storedHash] = user.password.split(":");

        // 🔐 Hash the entered password with the stored salt
        const hashedInput = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

        // 🔍 Compare hashed passwords
        if (hashedInput !== storedHash) {
            console.log("❌ Password comparison failed");
            return res.status(400).json({ message: "Invalid email or password" });
        }

        console.log("✅ Password Match Success!");

        // 🎟 Generate JWT Token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });

    } catch (error) {
        console.error("❌ Login Error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};




module.exports = { registerUser, loginUser };
