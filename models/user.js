const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// ✅ FIXED IMPORT
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: String
    },
    otpExpires: {
        type: Date
    }
});

// Passport plugin ko comment out kar rahe hain kyunki ab hum OTP auth use karenge
// userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);