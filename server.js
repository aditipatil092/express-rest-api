const express = require("express");
const moment = require("moment");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

let users = [
    {
        id: 1,
        name: "Aditi",
        email: "aditi@example.com",
        age: 22
    },
    {
        id: 2,
        name: "Rahul",
        email: "rahul@example.com",
        age: 25
    },
    {
        id: 3,
        name: "Riya",
        email: "riya@example.com",
        age: 17
    }
];

app.get("/", function (req, res) {
    res.send("Hello Server is running!");
});

app.get("/time", function (req, res) {
    const currentDateTime = moment().format("DD-MM-YYYY hh:mm:ss A");

    res.json({
        message: "Current date and time",
        dateTime: currentDateTime
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

app.get("/api/users", function (req, res) {
    res.json({
        message: "Users fetched successfully",
        totalUsers: users.length,
        users: users
    });
});

app.post("/api/users", function (req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const age = Number(req.body.age);

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

    const newUser = {
        id: users.length + 1,
        name: name.trim(),
        email: email.trim(),
        age: age
    };

    users.push(newUser);

    res.status(201).json({
        message: "User added successfully",
        user: newUser
    });
});

// Assignment 1: Search users by name
app.get("/users/search", function (req, res) {
    const name = req.query.name;

    if (!name || name.trim() === "") {
        return res.status(400).json({
            message: "Name query parameter is required. Example: /users/search?name=Rahul"
        });
    }

    const searchName = name.trim().toLowerCase();

    const matchedUsers = users.filter(function (user) {
        return user.name.toLowerCase().includes(searchName);
    });

    res.json({
        message: "Users searched successfully",
        search: name,
        totalUsers: matchedUsers.length,
        users: matchedUsers
    });
});

// Assignment 2: Return adult users only age >= 18
app.get("/users/adults", function (req, res) {
    const adultUsers = users.filter(function (user) {
        return user.age >= 18;
    });

    res.json({
        message: "Adult users fetched successfully",
        totalUsers: adultUsers.length,
        users: adultUsers
    });
});

// Assignment 3: Return only emails of all users
app.get("/users/emails", function (req, res) {
    const emails = users.map(function (user) {
        return user.email;
    });

    res.json({
        message: "User emails fetched successfully",
        totalEmails: emails.length,
        emails: emails
    });
});

app.get("/contact", function (req, res) {
    res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.listen(PORT, function () {
    console.log("Server is running on http://localhost:" + PORT);
});