// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const connectDB = require("./config/database");
const adminRoutes = require("./routes/admin");

const app = express();

// EJS Setup (for user-facing pages only)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
//app.use(express.static(path.join(__dirname, "public")));
app.use(express.static('public'));

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (for admin login)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: false,
  })
);

// ====================
// WEB ROUTES (EJS Pages)
// ====================

// Homepage
app.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const airlines = await db
      .collection("flights")
      .aggregate([
        { $group: { _id: "$airline", name: { $first: "$airline" } } },
        { $project: { name: "$name" } },
        { $sort: { name: 1 } },
      ])
      .toArray();

    res.render("pages/index", {
      title: "FlightMap Homepage",
      airlines,
    });
  } catch (error) {
    console.error("Error loading homepage:", error);
    res.render("pages/index", {
      title: "FlightMap Homepage",
      airlines: [],
    });
  }
});

// Search Page
app.get("/search", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    console.log('Search parameters:', req.query);
    const { departure, arrival, date, airline, fromHour, toHour } = req.query;
    
    // Build search query if parameters provided
    let results = [];

    if (departure) {
      let query = { "departureAirport.iataCode": departure.toUpperCase() };
      if (arrival) query["arrivalAirport.iataCode"] = arrival.toUpperCase();
      if (airline) query.airline = airline;

      if (date) {
        const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
          weekday: "long",
        });
        query.dayOfWeek = dayOfWeek;
      }

      results = await db
        .collection("flights")
        .find(query)
        .sort({ departureTime: 1 })
        .limit(50)
        .toArray();
    }

    // Filter results by time if fromHour and toHour provided
    for (i = 0; i < results.length; i++) {
      const date = new Date(results[i].departureTime);
      const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
      if (hours < fromHour || hours > toHour) {
        results.splice(i, 1);
        i--;
      }
    }
    
    // Get airlines for dropdown
    const airlines = await db.collection('flights').aggregate([
      { $group: { _id: '$airline', name: { $first: '$airline' } } },
      { $project: { name: '$name' } },
      { $sort: { name: 1 } }
    ]).toArray();
    
    res.render('pages/search', {
      title: 'FlightMap Search',
      results: results,
      airlines: airlines,
      searchParams: { departure, arrival, date, airline, fromHour, toHour }
    });
  } catch (error) {
    console.error("Error in search:", error);
    res.render("pages/search", {
      title: "FlightMap Search",
      results: [],
      airlines: [],
      searchParams: {},
    });
  }
});

// ====================
// API ROUTES
// ====================

// Mount new admin routes (login, logout, upload, summary, etc.)
app.use("/api/admin", adminRoutes);

// Flights API
app.get("/api/flights", async (req, res) => {
  try {
    const { departure, arrival, date, airline, limit = 50 } = req.query;
    const db = mongoose.connection.db;

    if (!departure)
      return res.status(400).json({ error: "Departure airport is required" });

    let query = { "departureAirport.iataCode": departure.toUpperCase() };
    if (arrival) query["arrivalAirport.iataCode"] = arrival.toUpperCase();
    if (airline) query.airline = airline;

    if (date) {
      const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
      });
      query.dayOfWeek = dayOfWeek;
    }

    const flights = await db
      .collection("flights")
      .find(query)
      .sort({ departureTime: 1 })
      .limit(parseInt(limit))
      .toArray();

    res.json(flights);
  } catch (error) {
    console.error("Flight search error:", error);
    res.status(500).json({ error: "Flight search failed" });
  }
});

// Airports API
app.get("/api/airports", async (req, res) => {
  try {
    const { search, limit = 5000 } = req.query;
    const db = mongoose.connection.db;

    let query = {};
    if (search) {
      query = {
        $or: [
          { iataCode: { $regex: search, $options: "i" } },
          { city: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      };
    }

    query["location.coordinates"] = { $exists: true, $ne: null };
    query["location.coordinates.0"] = { $gte: -180, $lte: 180 };
    query["location.coordinates.1"] = { $gte: -90, $lte: 90 };

    const airports = await db
      .collection("airports")
      .find(query)
      .limit(parseInt(limit))
      .toArray();

    const validAirports = airports.filter((a) => {
      const coords = a?.location?.coordinates;
      return (
        Array.isArray(coords) &&
        coords.length === 2 &&
        coords[0] >= -180 &&
        coords[0] <= 180 &&
        coords[1] >= -90 &&
        coords[1] <= 90
      );
    });

    res.json(validAirports);
  } catch (error) {
    console.error("Airport fetch error:", error);
    res.status(500).json({ error: "Failed to fetch airports" });
  }
});

// Airlines API
app.get("/api/airlines", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const airlines = await db
      .collection("flights")
      .aggregate([
        { $group: { _id: "$airline", name: { $first: "$airline" } } },
        { $project: { name: "$name" } },
        { $sort: { name: 1 } },
      ])
      .toArray();

    res.json(airlines);
  } catch (error) {
    console.error("Airlines fetch error:", error);
    res.status(500).json({ error: "Failed to fetch airlines" });
  }
});

// Destinations API
app.get("/api/destinations/:iataCode", async (req, res) => {
  try {
    const code = req.params.iataCode.toUpperCase();
    const db = mongoose.connection.db;

    const destinations = await db
      .collection("flights")
      .aggregate([
        { $match: { "departureAirport.iataCode": code } },
        {
          $group: {
            _id: "$arrivalAirport.iataCode",
            arrivalAirport: { $first: "$arrivalAirport" },
          },
        },
        { $replaceRoot: { newRoot: "$arrivalAirport" } },
      ])
      .toArray();

    res.json(destinations);
  } catch (error) {
    console.error("Destinations fetch error:", error);
    res.status(500).json({ error: "Failed to fetch destinations" });
  }
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend connected!",
    database: "MongoDB Atlas",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Homepage: http://localhost:${PORT}`);
  console.log(`Search: http://localhost:${PORT}/search`);
  console.log(`API: http://localhost:${PORT}/api/test`);
});

module.exports = app;
