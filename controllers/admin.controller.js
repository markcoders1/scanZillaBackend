import fs from 'fs'
import {User} from '../models/user.model.js'
import Joi from 'joi';
import { History } from '../models/history.model.js';
import { Offer } from '../models/offers.model.js';
import Stripe from 'stripe';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

export const getAllUsers = async (req, res) => {
    try {

        const result = await User.find().select("-password -refreshToken -__v");
        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        res.status(400).json({ error });
    }
};

export const toggleUserAccount = async (req, res) => {
    try {
        let { userId } = req.query;

        const user = await User.findById(userId);
        user.active = !user.active;
        await user.save();
        return res
            .status(200)
            .json({ message: "user account toggled successfully" });
    } catch (error) {
        return res.status(400).json({
            message: "something went wrong, please contact management",
        });
    }
};

export const getUser = async (req, res) => {
    try {
        const userId = req.query.id;
        if (typeof userId !== "string") {
            return res.status(401).json({ message: "ID must be string" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ message: "user does not exist" });
        }
        console.log(user);
        return res.status(200).json(user);
    } catch (error) {
        console.log(error);
        res.status(400).json({ error });
    }
};


const getWordsFromFile = () => {
    return new Promise((resolve, reject) => {
        fs.readFile("blacklistedWords.txt", 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            const words = data.split(/[^\S ]+/);
            resolve(words);
        });
    });
};

const writeWordsToFile = async (words) => {
    try {
        const data = words.join('\n');
        await fs.writeFile("blacklistedWords.txt", data,(err)=>{
            if(err) console.log(err)
        });
    } catch (error) {
        console.log(error)
        throw new Error('Failed to write words to file');
    }
};

export const getWords= async (req,res)=>{
    try {
        const words = await getWordsFromFile();
        res.status(200).json(words);
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to read words from file' });
    }

}

export const addWords = async (req,res) => {
    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty":"word cannot be null",
        "string.min":"word must contain atleast 1 character",
        "any.required":"word is required"
    })
    const newWord = req.body.word;
    const {error} = wordjoi.validate(newWord)

    if (error){
        return res.status(400).json({success:false,message: error.details[0].message})
    }

    try {
        const words = await getWordsFromFile();
        words.push(newWord);
        words.sort()
        await writeWordsToFile(words);
        res.status(201).json({ message: 'Word added successfully' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to add word to file' });
    }
}

export const removeWords = async (req,res) =>{
    const wordToRemove = req.query.word;

    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty":"word cannot be null",
        "string.min":"word must contain atleast 1 character",
        "any.required":"word is required"
    })

    const {error} = wordjoi.validate(wordToRemove)

    if(error){
        return res.status(400).json({success:false,message:"word invalid"})
    }

    try {
        let words = await getWordsFromFile();
        words = words.filter(word => word !== wordToRemove);
        await writeWordsToFile(words);
        res.status(200).json({ message: 'Word removed successfully' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to remove word from file' });
    }
}

export const changeRules = async (req,res) => {
    try{

        const rulesjoi = Joi.object({
            titleCharacters:Joi.number().min(0).message("incorrect value"),
            bulletNum:Joi.number().min(0).message("incorrect value"),
            bulletCharacters:Joi.number().min(0).message("incorrect value"),
            descriptionCharacters:Joi.number().min(0).message("incorrect value"),
            creditCost:Joi.number().min(0).message("incorrect value"),
            characterCost:Joi.number().min(0).message("incorrect value")
        })

        const {
            titleCharacters,
            bulletNum,
            bulletCharacters,
            descriptionCharacters,
            creditCost,
            characterCost
        } = req.body

        const {error} = rulesjoi.validate(req.body, { abortEarly: false });

        if (error){
            return res.status(400).json({message:"incorrect values"})
        }
    
        const obj = JSON.parse(fs.readFileSync('json/rules.json', 'utf8'));
    
        obj.titleCharacters = Number(titleCharacters || obj.titleCharacters)
        obj.bulletNum = Number(bulletNum || obj.bulletNum)
        obj.bulletCharacters = Number(bulletCharacters || obj.bulletCharacters)
        obj.descriptionCharacters = Number(descriptionCharacters || obj.descriptionCharacters)
        obj.creditCost = Number(creditCost || obj.creditCost)
        obj.characterCost = Number(characterCost || obj.characterCost)
    
        fs.writeFileSync('json/rules.json', JSON.stringify(obj, null, 2), 'utf8');

        res.status(200).send({ message: 'Rules updated successfully' });

    } catch (error) {

        console.error('Error updating rules:', error);
        res.status(500).send({ message: 'Error updating rules' });
        
    }

}

export const getRules = async (req,res)=>{
    try{
        const obj = JSON.parse(fs.readFileSync('json/rules.json', 'utf8'));
        res.status(200).json(obj)
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"something went wrong, please try again or contact support"})
    }
}

export const getTotalUsers = async (req,res)=>{
    try{
        const users = await User.countDocuments({role:"user",active:true})
        res.status(200).json({users})
    }catch(err){
        return res.status(500).json({message:"something went wrong, please try again or contact support"})
    }
}

export const getUserPurchases = async (req,res)=>{
    try{
        const {userId} = req.query
        const user = await User.findById(userId)

        const charges = await stripe.charges.list({customer:user.customerId})

        const payments = charges.data.map(async e=>{
            return {id:e.id,currency:e.currency,amount:e.amount,credits:e.metadata.credits,date:e.created}
        })
        return res.status(200).json({success:true,payments})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"something went wrong, please try again later or contact support"})
    }
}

export const getUserHistory = async (req,res)=>{
    try{
        const {userId} = req.query
        const Histories = await History.find({userID:userId})
        res.status(200).json(Histories)
    }catch(err){
        console.log(err)
        res.status(500).json({message:"something went wrong, please try again later or contact support"})
    }
}

export const getTotalIncome = async (req,res)=>{
    try{
        let charges = await stripe.charges.list({
            created:{
                gte:Date.now()-2629746000000,
            }
        })
        charges = charges?.data.map(e=>e.amount)

        const value = charges.reduce((a,b)=>a+b)
        res.status(200).json({value:`$${value/100}`})
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"something went wrong, please try again later or contact support"})
    }
}

export const changeOfferPricing = async (req,res)=>{
    try{

        const offerJoi = Joi.object({
            variant:Joi.number().min(-1),
            amount:Joi.number().min(100),
            name:Joi.string().min(2).max(20),
            description:Joi.string.min(10)
        })

        const {error} = offerJoi.validate(req.body)
        if (error){
            return res.status(400).json({success:false, message:"data invalid"})
        }

        let {variant, amount, name, description} = req.body

        amount = amount*100
        const offer = await Offer.findOne({variant})
        offer.amount = amount||offer.amount
        offer.name = name||offer.name
        offer.description = description||offer.description
        
        offer.save()
        
        res.status(200).json({success:true})

    }catch(err){
        console.log(err)
        return res.status(500).json({message:"something went wrong, please try again later or contact support"})
    }
}

export const getOffers = async (req,res) => {
    try{
        const offers = await Offer.find()
        res.status(200).json({success:true,offers})
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"something went wrong, please try again later or contact support"})
    }
}

export const getMostRecentHistory = async (req,res) =>{
    try{
        const history = await History.findOne({}, {}, { sort: { 'created_at' : -1 } })
        const user = await User.findById(history.userID)
        res.status(200).json({history,userName:user.userName})
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"something went wrong, please try again later or contact support"})
    }
}

export const giveUserCredits = async (req,res) => {
    try{
        const {userId,credits} = req.body
        const user = await User.findById(userId)

        user.credits+=credits
        user.save()

    }catch(err){
        console.log(err)
        return res.status(500).json({message:"something went wrong, please try again later or contact support"})
    }
}