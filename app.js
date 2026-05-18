if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session"); 
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash"); 
const cookieParser = require("cookie-parser");

// --- 1. IMPORT TRANSLATIONS & MODELS ---
const translations = require("./utils/translations.js");
const Listing = require("./models/listing.js");

// --- AUTHENTICATION IMPORTS ---
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/user.js");

// --- ROUTER IMPORTS ---
const listingsRouter = require("./routes/listings.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// --- DATABASE CONNECTION ---
// 🟢 CHANGED: Using Atlas URL from .env
const dbUrl = process.env.ATLASDB_URL;

async function main() { 
    await mongoose.connect(dbUrl); 
}

main()
    .then(() => { 
        console.log("connected to DB"); 
    })
    .catch((err) => { 
        console.log(err); 
    });

// --- MIDDLEWARE SETUP ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

app.use(cookieParser(process.env.SECRET));
// --- MONGO STORE SETUP ---
const store = MongoStore.create({ // Ensure this matches your require name
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

// --- SESSION & FLASH SETUP ---
const sessionOptions = {
    store: store, // 🟢 ADDED: Tells session to save in Atlas
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

// --- PASSPORT CONFIGURATION ---
app.use(passport.initialize());
app.use(passport.session()); 
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// --- 2. LOCAL VARIABLES & LANGUAGE MIDDLEWARE ---
app.use((req, res, next) => {
    let lang = req.cookies.lang || "en";
    res.locals.t = translations[lang] || translations["en"];
    res.locals.currLang = lang;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user; 
    next();
});

// --- 3. HELPER ROUTE: GET CURRENT USER ID ---
app.get("/get-user-id", (req, res) => {
    if(req.user) {
        res.send(`<h1>Your User ID is:</h1><p>${req.user._id}</p>`);
    } else {
        res.send("<h1>Please log in first!</h1>");
    }
});

// --- 4. LANGUAGE SWITCH ROUTE ---
app.get("/change-lang/:lang", (req, res) => {
    let { lang } = req.params;
    res.cookie("lang", lang, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true }); 
    res.redirect("/listings"); 
});

// --- MAIN ROUTE DELEGATION ---
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter); 

// --- ERROR HANDLING ---
app.all(/(.*)/, (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

app.listen(3000, () => {
    console.log("server is listening to port 3000");
});