import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import Joi from "joi";

export const test=(req,res)=>{
    try{
        return res.status(200).json({message:req.world})
    }catch(err){
        return res.status(400).json({message:"goodbye world!"})
        console.log(err)
    }
}

export const createUser=async (req,res)=>{
    try{
        const {email,password,userName}=req.body
        const userSearch = await User.findOne({$or: [ { email: email }, { userName: userName }]})
        console.log(userSearch)

        if(userSearch) return res.status(400).json({message:"user already exists"})

        const user=await User.create({email,password,userName})
        return res.status(200).json({user})
    }catch(err){
        return res.status(400).json({message:"goodbye world!"})
        console.log(err)
    }
}

const loginUserJoi = Joi.object({
    email: Joi.string().email().required().messages({
      "any.required": "Email is required.",
      "string.empty": "Email cannot be empty.",
      "string.email": "Invalid email format.",
    }),
  
    password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9@]{5,30}$")).messages({
      "string.pattern.base":
        'Password must contain only letters, numbers, or "@" and be between 5 and 30 characters long.',
    })
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
      throw new Error(
        "Something went wrong while generating Access and Refresh Tokens"
      );
    }
  };

export const loginUser=async (req,res)=>{
    try{
        const {email,password} = req.body
        const {error} = loginUserJoi.validate(req.body);
        if (error) {
            console.log(error);
            return res.status(400).json({ message: error.details});
        }
        

        const user = await User.findOne({email:email});
        if (!user) {
         return res.status(400).json({message:"user not found"})
        }
        if(!user.active){
         return res.status(400).json({message:"your account has been deactivated"})
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            return res.status(400).json({message:"email or password incorrect"})
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
            user._id
        );

        return res
            .status(200)
            .json({
               "message":"logged in successfully",
               accessToken,
               refreshToken
            })

    }catch(err){
        return res.status(400).json({message:"error",err})
    }
}

export const adminLogin=(req,res)=>{
    try{

    }catch(err){
        return res.status(400).json({message:"error",err})
    }
}

export const refreshAccessToken=(req,res)=>{
    try{
        const {refreshToken} =req.body
        
        if (refreshToken==null) return res.sendStatus(403)
        
        jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,async (err,decoded)=>{
            if(err) return res.sendStatus(403);
            const user = await User.findOne({email:decoded.email})
            if(user.refreshToken!==refreshToken) return res.sendStatus(403);

            const accessToken =jwt.sign({email:decoded.email},process.env.ACCESS_TOKEN_SECRET,{expiresIn:"15s"})
            res.status(200).json({message:"access Token refreshed",accessToken})

        })

    }catch(err){
        return res.status(400).json({message:"error",err})
    }
}

export const logoutUser=(req,res)=>{
    try{
        const {refreshToken} = req.body
        jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,async (err,decoded)=>{
            const user = await User.findOne({email:decoded.email})
            user.refreshToken=""
            user.save()
        })

        res.sendStatus(200);
    }catch(err){
        console.log(err);
        return res.status(400).json({message:"error",err})
    }
}

