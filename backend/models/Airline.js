// models/Airline.js
const mongoose = require('mongoose');

const airlineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  iataCode: { type: String, required: false },
  country: { type: String, required: false }
});

module.exports = mongoose.model('Airline', airlineSchema);
