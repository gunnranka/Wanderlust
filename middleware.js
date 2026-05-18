module.exports.isLoggedIn = (req, res, next) => {
    // Check if user is authenticated (Passport provides this method)
    if (!req.isAuthenticated()) {
        // Save the URL they were trying to access to redirect them back later
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to make changes!");
        return res.redirect("/login");
    }
    next();
};