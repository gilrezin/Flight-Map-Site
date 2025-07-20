
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas!');
    
    // Test queries
    const db = mongoose.connection.db;
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Test airports collection
    const airports = await db.collection('airports').findOne();
    if (airports) {
      console.log('Sample airport:', airports.name, airports.iataCode);
    }
    
    // Test flights collection
    const flights = await db.collection('flights').findOne();
    if (flights) {
      console.log('Sample flight found');
    }
    
    await mongoose.disconnect();
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();