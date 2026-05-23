module.exports.isLoggedIn = (req, res, next) => {
    // 🟢 FIXED: Check custom session user_id instead of old Passport req.isAuthenticated()
    if (!req.session.user_id) {
        // Save the URL they were trying to access to redirect them back later
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to make changes!");
        return res.redirect("/login");
    }
    next();
};