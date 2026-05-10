const express = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
const path = require("path");
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

// MongoDB connection
mongoose
    .connect(MONGO_URI)
    .then(function () {
        console.log("MongoDB connected successfully");
    })
    .catch(function (error) {
        console.error("MongoDB connection failed:", error.message);
    });

// Basic routes
app.get("/", function (req, res) {
    res.send("Hello Server is running!");
});

app.get("/time", function (req, res) {
    res.json({
        message: "Current date and time",
        dateTime: moment().format("DD-MM-YYYY hh:mm:ss A")
    });
});

app.get("/api", function (req, res) {
    res.json({
        message: "Hello from API",
        status: "success",
        serverTime: moment().format("DD-MM-YYYY hh:mm:ss A")
    });
});

app.get("/weather/:city", function (req, res) {
    const city = req.params.city;

    res.json({
        city: city,
        temp: "30°C"
    });
});

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

        if (isNaN(age) || age <= 0) {
            return res.status(400).json({
                message: "Valid age is required"
            });
        }

        if (!["admin", "user"].includes(role)) {
            return res.status(400).json({
                message: "Role must be either admin or user"
            });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.trim(),
            age: age,
            isActive: isActive,
            role: role
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

// Get only active users
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

// Fetch all admin users
app.get("/users/admins", async function (req, res) {
    try {
        const admins = await User.find({
            role: "admin",
            isActive: true
        });

        res.json({
            message: "Admin users fetched successfully",
            totalAdmins: admins.length,
            users: admins
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch admin users",
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

// Return average age of users
app.get("/users/average-age", async function (req, res) {
    try {
        const result = await User.aggregate([
            {
                $group: {
                    _id: null,
                    averageAge: { $avg: "$age" },
                    totalUsers: { $sum: 1 }
                }
            }
        ]);

        if (result.length === 0) {
            return res.json({
                message: "No users found",
                averageAge: 0,
                totalUsers: 0
            });
        }

        res.json({
            message: "Average age calculated successfully",
            averageAge: Number(result[0].averageAge.toFixed(2)),
            totalUsers: result[0].totalUsers
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to calculate average age",
            error: error.message
        });
    }
});

// Adult active users
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

// Active user emails
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

/*
|--------------------------------------------------------------------------
| PRODUCT CRUD ROUTES
|--------------------------------------------------------------------------
*/

// Create product
app.post("/api/products", async function (req, res) {
    try {
        const name = req.body.name;
        const price = Number(req.body.price);
        const stock = Number(req.body.stock);

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

        if (isNaN(stock) || stock < 0) {
            return res.status(400).json({
                message: "Valid product stock is required"
            });
        }

        const product = await Product.create({
            name: name.trim(),
            price: price,
            stock: stock
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

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product id"
            });
        }

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

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product id"
            });
        }

        const name = req.body.name;
        const price = Number(req.body.price);
        const stock = Number(req.body.stock);

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

        if (isNaN(stock) || stock < 0) {
            return res.status(400).json({
                message: "Valid product stock is required"
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {
                name: name.trim(),
                price: price,
                stock: stock
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

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product id"
            });
        }

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