
const mongoose = require('mongoose');

const airportSchema = new mongoose.Schema({
  iataCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 3
  },
  icaoCode: {
    type: String,
    required: true,
    uppercase: true,
    length: 4
  },
  name: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  timezone: {
    type: String,
    required: true
  }
}, {
  timestamps: false // Data doesn't have timestamps
});

// Indexes for efficient queries
airportSchema.index({ iataCode: 1 });
airportSchema.index({ city: 1 });
airportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Airport', airportSchema);