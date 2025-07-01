import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
let maintenance = false

export const verifyJWT = async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            throw new Error("Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findOne({ email: decodedToken.email }).select(
            "-password"
        );

        if (!user) {
            throw new Error("invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        console.log(error)
        res.status(401).json({
            message:error?.message || "Invalid Access Token",
            error
        })
    }
};

export const verifyAdmin = (req, res, next) => {
	if (req.user.role !== "admin") {
		return res.status(401).json({ message: "unauthorized" });
	} else {
		next();
	}
};

export const verifyMaintenance = (req, res, next) => {
    if(
        maintenance
        && req.user.role !== "admin"
        && req.user.email !== "amz@blazecopywriting.com"
        && req.user.email !== "fairmarket1984@gmail.com"
        && req.user.email !== "tomerlevin21@gmail.com"
        && req.user.email !== "muhammadharis571@gmail.com"
        // && req.user.email !== "bee@bee.com"
    ){
        return res.status(503).send({ message: "Scanzilla is under maintenance, please try again at a later time", success: false, errorType: "email" });
    }
    next()
};

export const testMiddleware=(req,res,next)=>{
    try{
        req.world="hello world!"
        next()
    }catch(err){
        return res.status(400).json({message:"goodbye world!"})
    }
}
