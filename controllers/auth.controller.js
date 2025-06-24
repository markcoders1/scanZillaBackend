import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { transporterConstructor, generateOTP } from "../utils/email.js";
import { getAuth } from "firebase-admin/auth";
import fs from "fs"
import { fileURLToPath } from 'url';
import path from "path"
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.resolve(__dirname, '../utils/serviceAccountKey.json');
let serviceAccount = fs.readFileSync(filePath,"utf-8")
serviceAccount = JSON.parse(serviceAccount)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const transporter = transporterConstructor();

export const test = (req, res) => {
    try {
        return res.status(200).json({ message: req.world });
    } catch (err) {
        return res.status(400).json({ message: "Goodbye world!" });
        console.log(err);
    }
};

export const createUser = async (req, res) => {
    try {
        const { email, password, userName } = req.body;
        const userSearch = await User.findOne({ $or: [{ email: email }] });

        if (userSearch) return res.status(400).json({ message: "User already exists." });

        const user = await User.create({ email, password, userName });

        console.log(user);

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

        const usr = await User.findOne({ email: email }).select("-password");

        return res.status(200).json({ message: "Signed up successfully", ...usr._doc, accessToken, refreshToken, success: true });
    } catch (err) {
        return res.status(400).json({ message: "Goodbye world!" });
        console.log(err);
    }
};

const loginUserJoi = Joi.object({
    email: Joi.string().email().required().messages({
        "any.required": "Email is required.",
        "string.empty": "Email cannot be empty.",
        "string.email": "Invalid email format.",
    }),

    password: Joi.string().required().messages({
        "any.required": "Password is required.",
        "string.empty": "Password Cannot be empty.",
    }),
});

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error("Something went wrong while generating Access and Refresh Tokens.");
    }
};

let maintenance = true
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).send({ message: "User not found.", success: false, errorType: "email" });
        }

        if(
            maintenance
            && user.role !== "admin"
            && user.email !== "amz@blazecopywriting.com"
            && user.email !== "fairmarket1984@gmail.com"
            && user.email !== "tomerlevin21@gmail.com"
            && user.email !== "muhammadharis571@gmail.com"
            // && user.email !== "bee@bee.com"
        ){
            return res.status(503).send({ message: "Scanzilla is under maintenance, please try again at a later time", success: false, errorType: "email" });
        }

        if (!user.active) {
            return res.status(400).send({ message: "User has been blocked.", success: false });
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Email or password incorrect.", success: false, errorType: "password" });
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

        const usr = await User.findOne({ email: email }).select("-password");

        return res.status(200).json({
            message: "Logged in successfully.",
            accessToken,
            refreshToken,
            ...usr._doc,
            success: true,
        });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ message: "error", err, success: false, errorType: "unexpected" });
    }
};

export const Oauth = async (req, res) => {
    try {
        const { idToken } = req.body;

        const decodedToken = await getAuth().verifyIdToken(idToken);

        if(maintenance)return res.status(503).send({ message: "Scanzilla is under maintenance, please try again at a later time", success: false, errorType: "email" });

        let user = await User.findOne({ email: decodedToken.email }).select("-password");

        if (!user) {
            user = await User.create({
                userName: decodedToken.name,
                email: decodedToken.email,
                password: `!${Date.now()}! !${Math.floor(Math.random() * 100)}!`,
            });
        }

        if (!user.active) {
            return res.status(400).send({ message: "user has been blocked", success: false });
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

        return res.status(200).json({
            message: "Logged in successfully.",
            accessToken,
            refreshToken,
            success: true,
            userName: user.userName,
            email: user.email,
            credits: user.credits,
            role: user.role,
            customerId: user.customerId,
            credits: user.credits,
            autocharge: user.autocharge,
            active: user.active,
            preferredCredits: user.preferredCredits,
        });
    } catch (error) {
        console.log(error);
    }
};

export const refreshAccessToken = (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken == null) return res.sendStatus(403);

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) return res.sendStatus(403);
            const user = await User.findOne({ email: decoded.email });
            if (user.refreshToken !== refreshToken) return res.sendStatus(403);

            const accessToken = jwt.sign({ email: decoded.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "5m" });
            res.status(200).json({ message: "access Token refreshed", accessToken });
        });
    } catch (err) {
        return res.status(400).json({ message: "error", err });
    }
};

export const logoutUser = (req, res) => {
    try {
        const { refreshToken } = req.body;
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            const user = await User.findOne({ email: decoded.email });
            user.refreshToken = "";
            user.save();
        });

        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.status(400).json({ message: "error", err });
    }
};

export const forgetpassword = async (req, res) => {
    try {
        const { otp, password, email } = req.body;

        const user = await User.findOne({ email });

        if (user.isotpCorrect(otp) && user.otpExpiry >= Date.now()) {
            user.password = password;
            user.save();
            return res.status(200).json({ message: "Password changed successfully" });
        } else {
            return res.status(400).json({ message: "OTP incorrect or expired" });
        }
    } catch (err) {
        console.log(err);
    }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const user = await User.findOne({ email: req.user.email });

        const changepass = await user.isPasswordCorrect(oldPassword);

        if (!changepass) {
            return res.status(400).json({ message: "old password incorrect" });
        }

        user.password = newPassword;
        user.save();
        res.status(200).json({ success: true, message: "password reset successfully" });
    } catch (error) {
        console.log(error);
    }
};

export const genOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const otp = generateOTP();

        const user = await User.findOne({ email });

        user.otp = otp;
        user.otpExpiry = Date.now() + 1000 * 60 * 5;

        user.save();

        transporter.sendMail({
            from: process.env.APP_EMAIL,
            to: email,
            subject: "OTP",
            text: `${otp}`,
        });
        res.status(200).json({ message: "mail sent" });
    } catch (err) {
        res.status(400).json({ message: "mail not sent" });
        console.log(err);
    }
};
