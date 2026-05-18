const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

// Atlas Connection URL
const dbUrl = "mongodb+srv://gunnr20050712:gunnranka0712@cluster0.0z2q86b.mongodb.net/wanderlust?retryWrites=true&w=majority";

// --- DATABASE CONNECTION ---
main()
  .then(() => {
    console.log("Connected to Atlas successfully!");
  })
  .catch((err) => {
    console.log("Database connection error:", err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

// --- INITIALIZATION LOGIC ---
const initDB = async () => {
  try {
    // 1. Clear existing data in Atlas
    await Listing.deleteMany({});
    console.log("Old data cleared from Atlas...");

    // 2. Map through sample data to add YOUR real User ID
    const updatedData = initData.data.map((obj) => ({
      ...obj,
      owner: "69e0a50e6995020071f215c9", // 🟢 Your correct User ID
      category: obj.category || "Trending",
    }));

    // 3. Insert the fresh data into Atlas
    await Listing.insertMany(updatedData);
    console.log("Data was initialized in Atlas with your User ID!");
    
  } catch (err) {
    console.log("Error during initialization:", err);
  } finally {
    // Close connection after seeding is done
    mongoose.connection.close();
    console.log("Atlas connection closed.");
  }
};

// Execute the function
initDB();