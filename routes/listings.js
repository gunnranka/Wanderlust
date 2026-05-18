const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema } = require("../schema.js");
const { isLoggedIn } = require("../middleware.js");
const multer = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const axios = require('axios');

// --- INDEX & CREATE ---
router.route("/")
    .get(wrapAsync(async (req, res) => {
        let { search, category } = req.query;
        let query = {};
        if (category) {
            query = { category: category };
        } else if (search && search.trim() !== "") {
            query = { 
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { location: { $regex: search, $options: "i" } },
                    { country: { $regex: search, $options: "i" } }
                ] 
            };
        }
        const allListings = await Listing.find(query);
        res.render("listings/index", { allListings });
    }))
    .post(isLoggedIn, upload.single("listing[image]"), wrapAsync(async (req, res) => {
        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;

        try {
            const location = req.body.listing.location;
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
            const response = await axios.get(url, { headers: { 'User-Agent': 'WanderlustProject' } });
            
            if (response.data.length > 0) {
                newListing.geometry = {
                    type: "Point",
                    coordinates: [parseFloat(response.data[0].lon), parseFloat(response.data[0].lat)]
                };
            }
        } catch (err) {
            newListing.geometry = { type: "Point", coordinates: [77.2090, 28.6139] }; 
        }

        if (req.file) {
            newListing.image = { url: req.file.path, filename: req.file.filename };
        }
        await newListing.save();
        req.flash("success", "New Listing Created!");
        res.redirect("/listings");
    }));

// --- NEW ROUTE ---
router.get("/new", isLoggedIn, (req, res) => {
    res.render("listings/new");
});

// --- SHOW, UPDATE, DELETE ---
router.route("/:id")
    .get(wrapAsync(async (req, res) => {
        const { id } = req.params;
        const listing = await Listing.findById(id)
            .populate({ path: "reviews", populate: { path: "author" } })
            .populate("owner");
        if (!listing) {
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }
        res.render("listings/show", { listing });
    }))
    .put(isLoggedIn, upload.single("listing[image]"), wrapAsync(async (req, res) => {
        const { id } = req.params;
        
        // 🔒 SECURITY RESTORED: Checking if the current user owns the listing
        let listing = await Listing.findById(id);
        if (!listing.owner.equals(res.locals.currUser._id)) {
            req.flash("error", "You don't have permission to edit this listing.");
            return res.redirect(`/listings/${id}`);
        }

        // Geocode the location
        try {
            const location = req.body.listing.location;
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
            const response = await axios.get(url, { headers: { 'User-Agent': 'WanderlustProject' } });
            
            if (response.data.length > 0) {
                req.body.listing.geometry = {
                    type: "Point",
                    coordinates: [parseFloat(response.data[0].lon), parseFloat(response.data[0].lat)]
                };
            }
        } catch (err) {
            console.error("Update Geocoding failed:", err);
        }

        let updatedListing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

        if (req.file) {
            updatedListing.image = { url: req.file.path, filename: req.file.filename };
            await updatedListing.save();
        }
        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    }))
    .delete(isLoggedIn, wrapAsync(async (req, res) => {
        const { id } = req.params;
        
        // 🔒 SECURITY RESTORED: Checking if the current user owns the listing
        let listing = await Listing.findById(id);
        if (!listing.owner.equals(res.locals.currUser._id)) {
            req.flash("error", "You don't have permission to delete this listing.");
            return res.redirect(`/listings/${id}`);
        }

        await Listing.findByIdAndDelete(id);
        req.flash("success", "Listing Deleted!");
        res.redirect("/listings");
    }));

// --- EDIT ROUTE ---
router.get("/:id/edit", isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    
    // Safety check for the edit form page as well
    if (!listing.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You don't have permission to edit this listing.");
        return res.redirect(`/listings/${id}`);
    }

    res.render("listings/edit", { listing });
}));

module.exports = router;