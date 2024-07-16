import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)


const userSchema = new mongoose.Schema({
    userName:{
        type: String,
        required:true,
        unique:true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    otp:{
        type: String,
        required:false
    },
    otpExpiry:{
        type: Number,
        required:false
    },
    refreshToken: {
        type: String,
    },
    credits:{
        type: Number,
        default: 0
    },
    customerId:{
        type: String,
    },
    autocharge:{
        type: Boolean,
        default:false
    }

},
{ timestamps: true }
); 
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('otp')) return next();
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
    next();
});

userSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const customer = await stripe.customers.create({
                email: this.email,
                name: this.userName,
            });
            this.customerId = customer.id;
        } catch (error) {
            next(error);
        }
    }
    next();
});


//custom method banaya hai
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.isotpCorrect = async function (otp) {
    return await bcrypt.compare(password, this.otp);
};


userSchema.methods.generateAccessToken = function () {
    //jwt ki documentation parho, iska sign method karta hai token generate
    return jwt.sign(
        {
            _id: this.ObjectId,
            email: this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "15m",
        }
    );
};
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            email:this.email,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: "6h",
        }
    );
};

export const User = mongoose.model("User", userSchema);
// yeh User database se direct contact kar sakta hai because it is made with mongoose.