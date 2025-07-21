const express = require("express");
const multer = require("multer");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const bcrypt = require("bcrypt");
const router = express.Router();
const Airline = require("../models/Airline");
const Admin = require("../models/Admin");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

client.connect().then(() => {
  db = client.db("flightmap");
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware to protect admin routes
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.redirect("/admin/login");
  }
  next();
}

// POST: Admin login (EJS version)
router.post("/login", express.urlencoded({ extended: true }), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render("admin/login", { error: "Missing username or password" });
  }

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.render("admin/login", { error: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.render("admin/login", { error: "Invalid credentials" });

    req.session.admin = { id: admin._id, username: admin.username };
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Login failed:", err);
    res.render("admin/login", { error: "Server error" });
  }
});

// POST: Admin logout (redirect to login)
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

// GET: Summary counts (protected, returns JSON to dashboard via fetch)
router.get("/summary", requireAdmin, async (req, res) => {
  try {
    const flightCount = await db.collection("flights").countDocuments();
    const airportCount = await db.collection("airports").countDocuments();
    const airlineCount = await db.collection("airlines").countDocuments();
    res.json({
      flights: flightCount,
      airports: airportCount,
      airlines: airlineCount,
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching summary counts." });
  }
});

// POST: Upload flights JSON (protected)
router.post("/uploadFlights", requireAdmin, upload.single("jsonFile"), async (req, res) => {
  try {
    const raw = req.file.buffer.toString("utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return res.status(400).send("Invalid JSON format.");
    }

    const result = await db.collection("flights").insertMany(data);
    res.send(`Uploaded ${result.insertedCount} flights successfully.`);
  } catch (err) {
    res.status(500).send("Error uploading flights.");
  }
});

// POST: Add airline name (protected)
router.post("/addAirline", requireAdmin, express.urlencoded({ extended: true }), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).send("Airline name is required.");

  try {
    const newAirline = new Airline({ name });
    await newAirline.save();
    res.send("Airline added successfully.");
  } catch (err) {
    res.status(500).send("Error adding airline.");
  }
});

module.exports = router;
