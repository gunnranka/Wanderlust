const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: { 
    type: String, 
    required: true 
  },

  description: String,

  image: { 
    url: String, 
    filename: String 
  },

  price: Number,

  location: String,

  country: String,

  reviews: [
    { 
      type: Schema.Types.ObjectId, 
      ref: "Review" 
    }
  ],

  owner: { 
    type: Schema.Types.ObjectId, 
    ref: "User" 
  },

  category: {
    type: String,
    enum: [
      "Trending",
      "Rooms",
      "Iconic Cities",
      "Mountains",
      "Castles",
      "Amazing Pools",
      "Camping",
      "Farms",
      "Arctic"
    ],
    required: true,
  },

  /* ✅ FIXED GEOMETRY */
  geometry: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"   // 🔥 DEFAULT ADDED
    },
    coordinates: {
      type: [Number],
      default: [73.8567, 18.5204] // 🔥 Pune default (lng, lat)
    }
  }
});

module.exports = mongoose.model("Listing", listingSchema);