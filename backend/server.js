const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');

const app = express();

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================
// WEB ROUTES (EJS Pages)
// ====================

// Homepage - Your index.ejs
app.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Get airlines for dropdown
    const airlines = await db.collection('flights').aggregate([
      { $group: { _id: '$airline', name: { $first: '$airline' } } },
      { $project: { name: '$name' } },
      { $sort: { name: 1 } }
    ]).toArray();
    
    res.render('pages/index', {
      title: 'FlightMap Homepage',
      airlines: airlines
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    res.render('pages/index', {
      title: 'FlightMap Homepage',
      airlines: []
    });
  }
});

// Search Page 
app.get('/search', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { departure, arrival, date, airline, maxPrice } = req.query;
    
    // Build search query if parameters provided
    let results = [];
    if (departure) {
      let query = {
        'departureAirport.iataCode': departure.toUpperCase()
      };
      
      if (arrival) query['arrivalAirport.iataCode'] = arrival.toUpperCase();
      if (airline && airline !== '') query.airline = airline;
      if (date) {
        const searchDate = new Date(date);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.departureTime = { $gte: searchDate, $lt: nextDay };
      }
      
      results = await db.collection('flights')
        .find(query)
        .sort({ departureTime: 1 })
        .limit(50)
        .toArray();
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
      searchParams: { departure, arrival, date, airline, maxPrice }
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.render('pages/search', {
      title: 'FlightMap Search',
      results: [],
      airlines: [],
      searchParams: {}
    });
  }
});

// Admin Dashboard - Your flight_admin_dashboard.ejs
app.get('/admin', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    const flightCount = await db.collection('flights').countDocuments();
    const activeFlightCount = await db.collection('flights').countDocuments({
      departureTime: { $gte: new Date() }
    });
    
    const hours = 2; // Mock hours since last update
    
    res.render('pages/flight_admin_dashboard', {
      title: 'Flight Map Admin Dashboard',
      flightCount: flightCount,
      activeFlightCount: activeFlightCount,
      hours: hours
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.render('pages/flight_admin_dashboard', {
      title: 'Flight Map Admin Dashboard',
      flightCount: 0,
      activeFlightCount: 0,
      hours: 0
    });
  }
});

// ====================
// API ROUTES
// ====================

// Flights API
app.get('/api/flights', async (req, res) => {
  try {
    const { departure, arrival, date, airline, limit = 50 } = req.query;
    const db = mongoose.connection.db;
    
    if (!departure) {
      return res.status(400).json({ error: 'Departure airport is required' });
    }
    
    let query = {
      'departureAirport.iataCode': departure.toUpperCase()
    };
    
    if (arrival) query['arrivalAirport.iataCode'] = arrival.toUpperCase();
    if (airline && airline !== '') query.airline = airline;
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.departureTime = { $gte: searchDate, $lt: nextDay };
    }
    
    const flights = await db.collection('flights')
      .find(query)
      .sort({ departureTime: 1 })
      .limit(parseInt(limit))
      .toArray();
    
    res.json(flights);
  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({ error: 'Flight search failed' });
  }
});

// Airports API
app.get('/api/airports', async (req, res) => {
  try {
    const { search, limit = 5000 } = req.query; // Increased default limit
    const db = mongoose.connection.db;
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { iataCode: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Ensure we only get airports with valid coordinates
    query['location.coordinates'] = { $exists: true, $ne: null };
    query['location.coordinates.0'] = { $gte: -180, $lte: 180 }; // Valid longitude
    query['location.coordinates.1'] = { $gte: -90, $lte: 90 };   // Valid latitude

    const airports = await db.collection('airports')
      .find(query)
      .limit(parseInt(limit))
      .toArray();

    // Filter out any airports with invalid coordinates as a safety check
    const validAirports = airports.filter(airport => {
      if (!airport.location || !airport.location.coordinates || 
          airport.location.coordinates.length !== 2) {
        return false;
      }
      
      const [lng, lat] = airport.location.coordinates;
      return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    });

    console.log(`Airports API: Returning ${validAirports.length} valid airports out of ${airports.length} total`);
    res.json(validAirports);
  } catch (error) {
    console.error('Airport fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// Airlines API
app.get('/api/airlines', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    const airlines = await db.collection('flights').aggregate([
      { $group: { _id: '$airline', name: { $first: '$airline' } } },
      { $project: { name: '$name' } },
      { $sort: { name: 1 } }
    ]).toArray();
    
    res.json(airlines);
  } catch (error) {
    console.error('Airlines fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch airlines' });
  }
});

// Destinations API
app.get('/api/destinations/:iataCode', async (req, res) => {
  try {
    const departureCode = req.params.iataCode.toUpperCase();
    const db = mongoose.connection.db;
    
    const destinations = await db.collection('flights').aggregate([
      { $match: { 'departureAirport.iataCode': departureCode } },
      { $group: { _id: '$arrivalAirport.iataCode', arrivalAirport: { $first: '$arrivalAirport' } } },
      { $replaceRoot: { newRoot: '$arrivalAirport' } }
    ]).toArray();
    
    res.json(destinations);
  } catch (error) {
    console.error('Destinations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend connected!', 
    database: 'MongoDB Atlas',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Homepage: http://localhost:${PORT}`);
  console.log(`Search: http://localhost:${PORT}/search`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`API: http://localhost:${PORT}/api/test`);
});

module.exports = app;