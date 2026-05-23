const express = require("express");
const router = express.Router();
const User = require("../models/user");
const nodemailer = require("nodemailer");
const wrapAsync = require("../utils/wrapAsync");
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

// --- 1. SMTP MAIL TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- 2. DYNAMIC GOOGLE REDIRECT URI LOGIC ---
// This automatically shifts your redirect endpoint depending on whether you are working locally or on Render
const REDIRECT_URI = process.env.NODE_ENV === "production"
    ? "https://your-deployed-app-url.onrender.com/auth/google/callback" // 👈 Replace with your real live Render domain URL
    : "http://localhost:3000/auth/google/callback";

// --- 3. BASIC AUTHENTICATION ROUTES (OTP FLOW) ---

// A. GET: Universal Login/Signup Interface
router.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

router.get("/signup", (req, res) => {
    res.redirect("/login"); // Route signup clicks into the unified entry form
});

// B. POST: Generate 6-Digit OTP & Dispatch Email
router.post("/login-otp", wrapAsync(async (req, res) => {
    const { email } = req.body;
    
    // Generate a secure 6-digit verification code string
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity lifespan

    // DB Sync: Match existing profile record, or register a fresh workspace document
    let user = await User.findOne({ email });
    if (!user) {
        user = new User({ email });
    }
    user.otp = generatedOtp;
    user.otpExpires = expiryTime;
    await user.save();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Wanderlust Verification Code",
        text: `Your confirmation code is ${generatedOtp}. It is valid for 5 minutes.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`Success: OTP sent to ${email}`);
    
    res.render("users/verify.ejs", { email });
}));

// C. POST: Validate Incoming User OTP Token Parameter Elements
router.post("/verify-otp", wrapAsync(async (req, res) => {
    const { otp } = req.body;
    
    const user = await User.findOne({
        otp: otp,
        otpExpires: { $gt: Date.now() } // Must be greater than current timestamp context
    });

    if (!user) {
        console.log("Auth Failed: Invalid or expired OTP.");
        req.flash("error", "Invalid or expired OTP. Please try again.");
        return res.redirect("/login");
    }

    // Clear verification flags from database document post-consumption
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Attach profile tracking pointer data to active memory footprint state
    req.session.user_id = user._id; 
    console.log("Auth State: ID attached to session. Syncing with Atlas...");

    req.session.save((err) => {
        if (err) {
            console.error("Session saving breakdown error:", err);
            return res.redirect("/login");
        }
        console.log("Auth Success! Session securely locked. Redirecting to dashboard.");
        req.flash("success", "Welcome back to Wanderlust!");
        res.redirect("/listings");
    });
}));

// D. GET: Safe Session Destruction / Logout Route Sequence
router.get("/logout", (req, res) => {
    req.session.user_id = null; 
    req.session.destroy(() => {
        console.log("User logged out successfully.");
        res.redirect("/listings");
    });
});

// --- 4. USER PROFILE MANAGEMENT ROUTE ---
router.get("/users/profile", wrapAsync(async (req, res) => {
    if (!req.session.user_id) {
        req.flash("error", "You must be logged in to view your profile.");
        return res.redirect("/login");
    }

    const user = await User.findById(req.session.user_id);
    if (!user) {
        req.flash("error", "User session data not found.");
        return res.redirect("/login");
    }
    
    let displayName = user.username || user.email.split("@")[0];
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    let userInitial = displayName.charAt(0).toUpperCase();

    res.render("users/profile.ejs", { user, displayName, userInitial });
}));

// --- 5. 👤 GOOGLE OAUTH INTERACTIVE AUTOMATION FLOWS ---

// A. Handshake Initializer: Channels clients out to secure Google Account UI Selector Panels
router.get("/auth/google", (req, res) => {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=profile%20email`;
    res.redirect(url);
});

// B. Callback Handler: Receives authorization codes, exchanges tokens, maps database entries
router.get("/auth/google/callback", wrapAsync(async (req, res) => {
    const { code } = req.query;
    if (!code) {
        req.flash("error", "Google authentication cancelled.");
        return res.redirect("/login");
    }

    try {
        // Exchange authentication authorization code for secure access profile token payload
        const tokenUrl = 'https://oauth2.googleapis.com/token';
        const response = await axios.post(tokenUrl, {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        });

        const { id_token } = response.data;

        // Verify key parameters integrity using library helper structures
        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { email, name } = payload;

        // DB Mapping: Resolve pre-existing profiles or build fresh accounts automatically
        let user = await User.findOne({ email: email });
        if (!user) {
            user = new User({ 
                email: email,
                username: name ? name.replace(/\s+/g, '').toLowerCase() : email.split("@")[0]
            });
            await user.save();
        }

        // Establish memory state identity mappings across app navigation flows
        req.session.user_id = user._id;
        
        req.session.save(() => {
            req.flash("success", `Welcome back to Wanderlust, ${user.username}!`);
            res.redirect("/listings");
        });

    } catch (err) {
        console.error("Google OAuth Exception occurred:", err);
        req.flash("error", "Google Login failed. Falling back to primary access methods.");
        res.redirect("/login");
    }
}));

module.exports = router;