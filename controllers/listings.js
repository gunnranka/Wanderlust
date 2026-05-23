const Listing = require("../models/listing");

module.exports.index = async (req, res) => {
    const { search } = req.query;
    let allListings;

    // Check if a user typed a keyword in the search bar
    if (search && search.trim() !== "") {
        // Find listings where title OR location matches the search string (case-insensitive)
        allListings = await Listing.find({
            $or: [
                { title: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ]
        });
    } else {
        // If no search query, display everything as usual
        allListings = await Listing.find({});
    }

    res.render("listings/index.ejs", { allListings });
};
module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author" },
        })
        .populate("owner");
        
    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    if (req.file) {
        newListing.image = { url: req.file.path, filename: req.file.filename };
    }

    // 🟢 Standard Coordinates for Pune
    newListing.geometry = { 
        type: 'Point', 
        coordinates: [73.8567, 18.5204] 
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/edit.ejs", { listing });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    
    // Spread the body and update
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    // Ensure edited listings also have coordinates if they were missing
    if (!listing.geometry || !listing.geometry.coordinates.length) {
        listing.geometry = { 
            type: 'Point', 
            coordinates: [73.8567, 18.5204] 
        };
    }

    if (req.file) {
        listing.image = { url: req.file.path, filename: req.file.filename };
    }
    
    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};