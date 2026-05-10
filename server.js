const express = require("express");
const moment = require("moment");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const Product = require("./models/Product");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Database connection
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
    res.send("Hello Server is running!");
});

// Time route
app.get("/time", function (req, res) {
    const currentDateTime = moment().format("DD-MM-YYYY hh:mm:ss A");

    res.json({
        message: "Current date and time",
        dateTime: currentDateTime
    });
});

// Basic API route
app.get("/api", function (req, res) {
    res.json({
        message: "Hello from API",
        status: "success",
        serverTime: moment().format("DD-MM-YYYY hh:mm:ss A")
    });
});

// Weather route
app.get("/weather/:city", function (req, res) {
    const city = req.params.city;

    res.json({
        city: city,
        temp: "30°C"
    });
});

// Contact page
app.get("/contact", function (req, res) {
    res.sendFile(path.join(__dirname, "public", "contact.html"));
});

/*
|--------------------------------------------------------------------------
| USER ROUTES
|--------------------------------------------------------------------------
*/

// Create user
app.post("/api/users", async function (req, res) {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const age = Number(req.body.age);
        const isActive = req.body.isActive === undefined ? true : req.body.isActive;

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

        if (!age || age <= 0) {
            return res.status(400).json({
                message: "Valid age is required"
            });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.trim(),
            age: age,
            isActive: isActive
        });

        res.status(201).json({
            message: "User created successfully",
            user: user
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to create user",
            error: error.message
        });
    }
});

// Get all active users only
app.get("/api/users", async function (req, res) {
    try {
        const users = await User.find({ isActive: true });

        res.json({
            message: "Active users fetched successfully",
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch users",
            error: error.message
        });
    }
});

// Search users by name
app.get("/users/search", async function (req, res) {
    try {
        const name = req.query.name;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                message: "Name query parameter is required. Example: /users/search?name=Rahul"
            });
        }

        const users = await User.find({
            name: { $regex: name.trim(), $options: "i" },
            isActive: true
        });

        res.json({
            message: "Users searched successfully",
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

// Get adult users
app.get("/users/adults", async function (req, res) {
    try {
        const users = await User.find({
            age: { $gte: 18 },
            isActive: true
        });

        res.json({
            message: "Adult active users fetched successfully",
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch adult users",
            error: error.message
        });
    }
});

// Get only emails of active users
app.get("/users/emails", async function (req, res) {
    try {
        const users = await User.find(
            { isActive: true },
            { email: 1, _id: 0 }
        );

        const emails = users.map(function (user) {
            return user.email;
        });

        res.json({
            message: "Active user emails fetched successfully",
            totalEmails: emails.length,
            emails: emails
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch user emails",
            error: error.message
        });
    }
});

// Fetch users older than given age
app.get("/users/age/:min", async function (req, res) {
    try {
        const minAge = Number(req.params.min);

        if (isNaN(minAge) || minAge < 0) {
            return res.status(400).json({
                message: "Valid minimum age is required"
            });
        }

        const users = await User.find({
            age: { $gt: minAge },
            isActive: true
        });

        res.json({
            message: "Users older than given age fetched successfully",
            minAge: minAge,
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch users by age",
            error: error.message
        });
    }
});

/*
|--------------------------------------------------------------------------
| PRODUCT ROUTES - CRUD
|--------------------------------------------------------------------------
*/

// Create product
app.post("/api/products", async function (req, res) {
    try {
        const name = req.body.name;
        const price = Number(req.body.price);
        const category = req.body.category;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                message: "Product name is required"
            });
        }

        if (isNaN(price) || price < 0) {
            return res.status(400).json({
                message: "Valid product price is required"
            });
        }

        if (!category || category.trim() === "") {
            return res.status(400).json({
                message: "Product category is required"
            });
        }

        const product = await Product.create({
            name: name.trim(),
            price: price,
            category: category.trim()
        });

        res.status(201).json({
            message: "Product created successfully",
            product: product
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to create product",
            error: error.message
        });
    }
});

// Get all products
app.get("/api/products", async function (req, res) {
    try {
        const products = await Product.find();

        res.json({
            message: "Products fetched successfully",
            totalProducts: products.length,
            products: products
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch products",
            error: error.message
        });
    }
});

// Get product by id
app.get("/api/products/:id", async function (req, res) {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product fetched successfully",
            product: product
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch product",
            error: error.message
        });
    }
});

// Update product
app.put("/api/products/:id", async function (req, res) {
    try {
        const productId = req.params.id;

        const name = req.body.name;
        const price = Number(req.body.price);
        const category = req.body.category;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                message: "Product name is required"
            });
        }

        if (isNaN(price) || price < 0) {
            return res.status(400).json({
                message: "Valid product price is required"
            });
        }

        if (!category || category.trim() === "") {
            return res.status(400).json({
                message: "Product category is required"
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {
                name: name.trim(),
                price: price,
                category: category.trim()
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update product",
            error: error.message
        });
    }
});

// Delete product
app.delete("/api/products/:id", async function (req, res) {
    try {
        const productId = req.params.id;

        const deletedProduct = await Product.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product deleted successfully",
            product: deletedProduct
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete product",
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, function () {
    console.log("Server is running on http://localhost:" + PORT);
});