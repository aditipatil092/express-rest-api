const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const User = require("./models/User");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let tokenBlacklist = [];

// MongoDB connection
mongoose
    .connect(MONGO_URI)
    .then(function () {
        console.log("MongoDB connected successfully");
    })
    .catch(function (error) {
        console.error("MongoDB connection failed:", error.message);
    });

// Home route
app.get("/", function (req, res) {
    res.send("Auth API is running");
});

/*
|--------------------------------------------------------------------------
| AUTH MIDDLEWARE
|--------------------------------------------------------------------------
*/

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            message: "Authorization header is required"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token is required"
        });
    }

    if (tokenBlacklist.includes(token)) {
        return res.status(401).json({
            message: "Token has been logged out. Please login again."
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

function authorizeAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Access denied. Admins only."
        });
    }

    next();
}

/*
|--------------------------------------------------------------------------
| AUTH ROUTES
|--------------------------------------------------------------------------
*/

// Signup route with duplicate email prevention
app.post("/signup", async function (req, res) {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        const role = req.body.role || "user";

        if (!name || name.trim() === "") {
            return res.status(400).json({
                message: "Name is required"
            });
        }

        if (!email || email.trim() === "") {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        if (!["admin", "user"].includes(role)) {
            return res.status(400).json({
                message: "Role must be either admin or user"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already exists. Please use another email."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: role
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Signup failed",
            error: error.message
        });
    }
});

// Login route
app.post("/login", async function (req, res) {
    try {
        const email = req.body.email;
        const password = req.body.password;

        if (!email || email.trim() === "") {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!password || password.trim() === "") {
            return res.status(400).json({
                message: "Password is required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login successful",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
});

// Protected profile route
app.get("/profile", authenticateToken, async function (req, res) {
    res.json({
        message: "Profile accessed successfully",
        user: req.user
    });
});

// Admin-only route
app.get("/admin", authenticateToken, authorizeAdmin, function (req, res) {
    res.json({
        message: "Welcome Admin. You have access to this route.",
        user: req.user
    });
});

// Logout route: blacklist token
app.post("/logout", authenticateToken, function (req, res) {
    const authHeader = req.headers["authorization"];
    const token = authHeader.split(" ")[1];

    if (!tokenBlacklist.includes(token)) {
        tokenBlacklist.push(token);
    }

    res.json({
        message: "Logout successful. Token invalidated."
    });
});

// Optional route to see blacklisted tokens count
app.get("/blacklist-count", function (req, res) {
    res.json({
        blacklistedTokens: tokenBlacklist.length
    });
});

// Search users by name
app.get("/users/search", authenticateToken, async function (req, res) {
    try {
        const name = req.query.name;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                message: "Name query parameter is required"
            });
        }

        const users = await User.find(
            {
                name: {
                    $regex: name.trim(),
                    $options: "i"
                }
            },
            {
                password: 0
            }
        );

        res.json({
            message: "Users fetched successfully",
            search: name,
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to search users",
            error: error.message
        });
    }
});

app.listen(PORT, function () {
    console.log("Auth API is running on http://localhost:" + PORT);
});