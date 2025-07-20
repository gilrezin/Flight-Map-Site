// routes/admin.js
const express = require("express");
const multer = require("multer");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");
const router = express.Router();
const Airline = require("../models/Airline");
const Admin = require("../models/Admin"); // New Admin model

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

client.connect().then(() => {
  db = client.db("flightmap");
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware to protect admin routes
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// POST: Admin login
router.post("/login", express.json(), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    req.session.adminId = admin._id;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// POST: Admin logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET: Summary counts (protected)
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
    if (!Array.isArray(data))
      return res.status(400).json({ error: "Invalid format" });

    const result = await db.collection("flights").insertMany(data);
    res.json({ insertedCount: result.insertedCount });
  } catch (err) {
    res.status(500).json({ error: "Error uploading flights." });
  }
});

// POST: Add airline name using Mongoose model (protected)
router.post("/addAirline", requireAdmin, express.json(), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Airline name required" });

  try {
    const newAirline = new Airline({ name });
    await newAirline.save();
    res.json({ success: true, insertedId: newAirline._id });
  } catch (err) {
    res.status(500).json({ error: "Error adding airline." });
  }
});

module.exports = router;
