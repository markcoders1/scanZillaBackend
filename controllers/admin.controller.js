import fs from 'fs/promises'
import {User} from '../models/user.model.js'
import Joi from 'joi';
import { History } from '../models/history.model.js';
import { Offer } from '../models/offers.model.js';
import Stripe from 'stripe';
import dotenv from 'dotenv'
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod.mjs';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';


/*
    {
        TE:[title error],
        TF:[title fixed],
        DE:[description error],
        DF:[description fixed],
        BE:[bullet point error],
        BF:[bullet point fixed]
    }
*/
const responseSchema = z.object({
    titleErrors:z.array(z.string()),
    descriptionErrors:z.array(z.string()),
    bulletPointErrors:z.array(z.string()),
})

const titleSchema = z.object({
    titleErrors:z.array(z.string()),
})

const descriptionSchema = z.object({
    descriptionErrors:z.array(z.string()),
})

const bulletsSchema = z.object({
    bulletPointErrors:z.array(z.string()),
})


dotenv.config()

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
const openai = new OpenAI(process.env.OPENAI_API_KEY)

// const assId = "asst_J8gYM42wapsrXpntcCLMe8wJ"


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
            message: "Something went wrong, Please contact management.",
        });
    }
};

export const getUser = async (req, res) => {
    try {
        const userId = req.query.id;
        if (typeof userId !== "string") {
            return res.status(401).json({ message: "ID must be string." });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ message: "User does not exist." });
        }
        console.log(user);
        return res.status(200).json(user);
    } catch (error) {
        console.log(error);
        res.status(400).json({ error });
    }
};

export const changeRules = async (req,res) => {
    try{

        const rulesjoi = Joi.object({
            titleCharacters:Joi.number().min(0).message("Incorrect value."),
            bulletNum:Joi.number().min(0).message("Incorrect value."),
            bulletCharacters:Joi.number().min(0).message("Incorrect value."),
            descriptionCharacters:Joi.number().min(0).message("Incorrect value."),
            creditCost:Joi.number().min(0).message("Incorrect value."),
            characterCost:Joi.number().min(0).message("Incorrect value."),
            category:Joi.string().min(0),
            totalBulletsLength:Joi.number().min(0).message("Incorrect value."),
            searchTerms:Joi.number().min(0).message("Incorrect value.")
        })

        const {
            titleCharacters,
            bulletNum,
            bulletCharacters,
            descriptionCharacters,
            creditCost,
            characterCost,
            category,
            totalBulletsLength,
            searchTerms
        } = req.body

        const {error} = rulesjoi.validate(req.body, { abortEarly: false });

        if(titleCharacters && !category){
            return res.status(400).json({message:"Enter the category you want to set a title limit on."})
        }

        if (error){
            console.log(error.details)
            return res.status(400).json({message:"Incorrect values."})
        }
    
        const obj = JSON.parse(await fs.readFile('json/rules.json', 'utf8'));
    
        // obj.titleCharacters = Number(titleCharacters || obj.titleCharacters)
        obj.bulletNum = Number(bulletNum || obj.bulletNum)
        obj.bulletCharacters = Number(bulletCharacters || obj.bulletCharacters)
        obj.descriptionCharacters = Number(descriptionCharacters || obj.descriptionCharacters)
        obj.creditCost = Number(creditCost || obj.creditCost)
        obj.characterCost = Number(characterCost || obj.characterCost)
        obj[category] = Number(titleCharacters || obj[category])
        obj.totalBulletsLength = Number(totalBulletsLength || obj.totalBulletsLength)
        obj.searchTerms = Number(searchTerms || obj.searchTerms)
    
        await fs.writeFile('json/rules.json', JSON.stringify(obj, null, 2), 'utf8');

        res.status(200).send({ message: 'Rules updated successfully.' });

    } catch (error) {

        console.error('Error updating rules:', error);
        res.status(500).send({ message: 'Error updating rules.' });
        
    }

}

export const getTotalUsers = async (req,res)=>{
    try{
        const users = await User.countDocuments({role:"user",active:true})
        res.status(200).json({users})
    }catch(err){
        return res.status(500).json({message:"Something went wrong, Please try again or contact support."})
    }
}

export const getUserPurchases = async (req,res)=>{
    try{
        const {userId} = req.query
        const user = await User.findById(userId)

        let payments = []

        if(user.customerId){
            const charges = await stripe.charges.list({customer:user.customerId})
    
            payments = charges.data.map(e=>{
                return {currency:e.currency,amount:e.amount,credits:e.metadata.credits,date:e.created}
            })
        }

        return res.status(200).json({success:true,payments})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const getUserHistory = async (req,res)=>{
    try{
        const {userId} = req.query
        const Histories = await History.find({userID:userId})
        res.status(200).json(Histories)
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}


export const getIncome = async (req,res)=>{
    try{
        let charges = [];
        let hasMore = true;
        let lastId = null;
        let now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
        const start = Date.now()
        
        while (hasMore) {
            let response

            if(lastId){
                response = await stripe.charges.list({ created: { gte: startOfMonth }, limit: 100, starting_after: lastId });
            }else{
                response = await stripe.charges.list({ created: { gte: startOfMonth }, limit: 100, });
            }
        
            charges = charges.concat(response.data);
            hasMore = response.has_more;
            if (hasMore) {
                lastId = response.data[response.data.length - 1].id;
            }
        }



        let graphdata = charges.map(e=>{
            let datecreated = new Date(e.created*1000)
            return {amount:e.amount,createdAt:datecreated.getDate()}
        })

        let aggregatedData = graphdata.reduce((acc, curr) => {
            if (!acc[curr.createdAt]) {
                acc[curr.createdAt] = 0;
            }
            acc[curr.createdAt] += curr.amount;
            return acc;
        }, {});
        
        let latestDate = Math.max(...graphdata.map(item => item.createdAt));
        let result = [];
        
        for (let i = 1; i <= latestDate; i++) {
            result.push({ amount: aggregatedData[i] || 0, createdAt: i });
        }

        charges = graphdata.map(e=>e.amount)

        let value = charges.reduce((a,b)=>a+b,0)
        value = value/100
        value = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

        res.status(200).json({value,result})
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const changeOfferPricing = async (req,res)=>{
    try{

        const offerJoi = Joi.object({
            variant:Joi.number().min(-1),
            amount:Joi.number().min(0),
            name:Joi.string().min(0).max(20),
            buttonText:Joi.string().min(0),
            description:Joi.string(),
            credits:Joi.number().min(0)
        })

        const {error} = offerJoi.validate(req.body)
        if (error){
            console.log(error)
            return res.status(400).json({success:false, message:"Data Invalid"})
        }

        let {variant, amount, name, buttonText, credits, description} = req.body

        amount = amount*100
        const offer = await Offer.findOne({variant})
        offer.amount = amount||offer.amount
        offer.name = name||offer.name
        offer.buttonText = buttonText||offer.buttonText
        offer.credits = credits||offer.credits
        offer.description = description || offer.description
        
        offer.save()
        
        res.status(200).json({success:true})

    }catch(err){
        console.log(err)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const giveUserCredits = async (req,res) => {
    try{
        let {userId,credits} = req.body

        if (!userId||!credits){
            return res.status(400).json({message:"Values not found."})
        }

        const user = await User.findById(userId)

        credits = Number(credits)

        user.credits+=credits
        user.save()

        return res.status(200).json({success:true, userCredits:user.credits, message:`You have successfully sent ${credits} credits to user: ${user.userName}`})

    }catch(err){
        console.log(err)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const takeUserCredits = async (req,res) => {
    try{
        let {userId,credits} = req.body

        if (!userId||!credits){
            return res.status(400).json({message:"Values not found."})
        }

        const user = await User.findById(userId)

        credits = Number(credits)

        if(credits>user.credits){
            user.credits=0
        }else{
            user.credits-=credits
        }
        user.save()


        return res.status(200).json({success:true, userCredits:user.credits, message:`You have successfully removed ${credits} credits from user: ${user.userName}`})

    }catch(err){
        console.log(err)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const analysisgraph = async (req,res)=>{
    try{
        const now = new Date()
        const disMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        let histories = await History.find({createdAt: {$gte:disMonth}})
        histories = histories.map(e=>{
            const date = new Date(e.createdAt)
            return date.getDate()
        })
        histories.push(0)

        const maxNumber =[...new Set(histories)].sort((a,b)=>b-a)[0];
        const counts = Array(maxNumber).fill(0);
        
        histories.forEach(num => {
            counts[num - 1]++;
        });
        
        const result = counts.map((count, index) => ({
            date: index + 1,
            analysis: count
        }));

        res.status(200).json(result)
    }catch(error){
        console.log(error)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const getAssInstructions = async (req,res) => {
    try{
        const instructions = JSON.parse(await fs.readFile('json/AI.rules.json', 'utf8'))
        res.status(200).json({title:instructions.title,description:instructions.description,bullets:instructions.bullets})
    }catch(error){
        console.log(error)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const updateAssInstructions = async (req,res) =>{
    try{
        const {titleDo,titleDont,descriptionDo,descriptionDont,bulletsDo,bulletsDont} = req.body
        const instructions = JSON.parse(await fs.readFile('json/AI.rules.json', 'utf8'))

        instructions.title.Dos = titleDo || instructions.title.Dos
        instructions.title.Donts = titleDont || instructions.title.Donts
        instructions.description.Dos = descriptionDo || instructions.description.Dos
        instructions.description.Donts = descriptionDont || instructions.description.Donts
        instructions.bullets.Dos = bulletsDo || instructions.bullets.Dos
        instructions.bullets.Donts = bulletsDont || instructions.bullets.Donts

        await fs.writeFile('json/AI.rules.json', JSON.stringify(instructions, null, 2), 'utf8');

        const updatefunc = async (assId,valUpdate,schema) => {
            return await openai.beta.assistants.update(
            assId,
            {
              instructions:`${instructions.fixed}       here are the dos and donts for the ${valUpdate}:     DOs: ${instructions[valUpdate].Dos.join("-")}      DONTs: ${instructions[valUpdate].Donts.join("-")}`,
              response_format:zodResponseFormat(schema,`${valUpdate}`),
              model:"gpt-4o-2024-08-06",
              temperature:0.6
            }
            );
        }

        const updates = []
        if(titleDo||titleDont||true){
            updates.push(updatefunc('asst_3nOxuR6z7N3xY1ZC1WKYAIhe','title',titleSchema))
        }
        if(descriptionDo||descriptionDont||true){
            updates.push(updatefunc('asst_GokOIlMbjA1jlvKb8pLNMR51','description',descriptionSchema))
        }
        if(bulletsDo||bulletsDont||true){
            updates.push(updatefunc('asst_vZhSQFlyB4lcTEaJhk0FitZa','bullets',bulletsSchema))
        }
        const update = await Promise.all(updates)
        console.log("update")

        res.status(200).json({success:true, message:"AI rules changed successfully", update})
    }catch(error){
        console.log(error)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const makeAdmin = async (req,res) =>{
    try{
        const { userId } = req.query
        const user = await User.findById(userId)
        user.role=="user"?user.role="admin":user.role="user"
        user.save()
        res.status(200).json({success:true,message:`user toggled ${user.role} successfully`,role:user.role})
    }catch(error){
        console.log(error)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

const getWordsFromFile = async (filepath) => {
    try {
        let path = filepath || "BW1242.csv"
        const fileContent = await fs.readFile(path);
        const words = parse(fileContent).map(row => row[0]);
        return words;
    } catch (error) {
        console.log(error);
        throw new Error('Failed to read words from file');
    }
};

const writeWordsToFile = async (words) => {
    try {
        const data = stringify(words.map(word => [word]).sort());
        await fs.writeFile("BW1242.csv", data, (err) => {
            if (err) console.log(err);
        });
    } catch (error) {
        console.log(error);
        throw new Error('Failed to write words to file');
    }
};

export const getWords= async (req,res)=>{
    try {
        const words = await getWordsFromFile("BW1242.csv");
        res.status(200).json(words);
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to read words from file' });
    }

}

export const addWords = async (req,res) => {
    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty":"Word cannot be null",
        "string.min":"Word must contain atleast 1 character",
        "any.required":"Word is required"
    })
    const newWord = req.body.word;
    const {error} = wordjoi.validate(newWord)

    if (error){
        return res.status(400).json({success:false,message: error.details[0].message})
    }

    try {
        const words = await getWordsFromFile();
        if (words.includes(newWord)){
            return res.status(400).json({success:false,message:"Word already exists."})
        }
        words.push(newWord);
        words.sort()
        await writeWordsToFile(words);
        return res.status(201).json({ success:true,message: 'Word added successfully.',words });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Failed to add word to file.' });
    }
}

export const removeWords = async (req,res) =>{
    const wordToRemove = req.query.word;

    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty":"Word cannot be null.",
        "string.min":"Word must contain atleast 1 character.",
        "any.required":"Word is required."
    })

    const {error} = wordjoi.validate(wordToRemove)

    if(error){
        return res.status(400).json({success:false,message:"Word Invalid."})
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

export const uploadCsv = async (req,res) => {
    try{
        if(req.file.mimetype!="text/csv"){
            return res.status(400).json({message:"Incorrect Filetype.",success:false})
        }
        const words = await getWordsFromFile(req.file.path)
        await fs.rm(`./${req.file.path}`)
        await writeWordsToFile(words)
        res.status(200).json({message:"Uploaded csv successfully.",words})
    }catch(error){
        console.log(error)
    }
}

export const downloadCsv = async (req,res)=>{
    try{
        res.download("./BW1242.csv")
    }catch(error){
        console.log(error)
    }
}


const writeAbbWordsToFile = async (words) => {
    try {
        const data = stringify(words.map(word => [word.toUpperCase()]).sort());
        await fs.writeFile("AA1242.csv", data, (err) => {
            if (err) console.log(err);
        });
    } catch (error) {
        console.log(error);
        throw new Error('Failed to write words to file');
    }
};

export const getAbbWords= async (req,res)=>{
    try {
        const words = await getWordsFromFile("AA1242.csv");
        res.status(200).json(words);
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to read words from file.' });
    }

}

export const addAbbWords = async (req,res) => {
    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty":"Word cannot be null",
        "string.min":"Word must contain atleast 1 character.",
        "any.required":"Word is required."
    })
    const newWord = req.body.word;
    const {error} = wordjoi.validate(newWord)

    if (error){
        return res.status(400).json({success:false,message: error.details[0].message})
    }

    try {
        const words = await getWordsFromFile("AA1242.csv");
        if (words.includes(newWord.toUpperCase())){
            return res.status(400).json({success:false,message:"Word already exists."})
        }
        words.push(newWord.toUpperCase());
        words.sort()
        await writeAbbWordsToFile(words);
        return res.status(201).json({ success:true,message: 'Word added successfully.',words });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Failed to add word to file.' });
    }
}

export const removeAbbWords = async (req,res) =>{
    const wordToRemove = req.query.word;

    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty":"Word cannot be null.",
        "string.min":"Word must contain atleast 1 character.",
        "any.required":"Word is required."
    })

    const {error} = wordjoi.validate(wordToRemove)

    if(error){
        return res.status(400).json({success:false,message:"Word Invalid"})
    }

    try {
        let words = await getWordsFromFile("AA1242.csv");
        words = words.filter(word => word !== wordToRemove.toUpperCase());
        await writeAbbWordsToFile(words);
        res.status(200).json({ message: 'Word removed successfully.' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to remove word from file.' });
    }
}

export const uploadAbbCsv = async (req,res) => {
    try{
        if(req.file.mimetype!="text/csv"){
            return res.status(400).json({message:"incorrect filetype.",success:false})
        }
        const words = await getWordsFromFile(req.file.path)
        await fs.rm(`./${req.file.path}`)
        await writeAbbWordsToFile(words)
        res.status(200).json({message:"Uploaded csv successfully.",words})
    }catch(error){
        console.log(error)
    }
}

export const downloadAbbCsv = async (req,res)=>{
    try{
        res.download("./AA1242.csv")
    }catch(error){
        console.log(error)
    }
}

export const creditsUsed = async (req, res) => {
    try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); // First day of the current month
        const today = new Date();
        const results = [];
        let totalCreditsUsed = 0

        // Loop through each day of the current month only
        for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);

            // Find records created on this specific day, within the current month
            const dailyAnalysis = await History.find({
                createdAt: { $gte: d, $lt: nextDay }
            }).lean();

            let credits = 0;
            dailyAnalysis.forEach(({ title, description, bullets }) => {
                if (title.length >= 0) credits++;
                if (description.length > 0) credits++;
                if (bullets.length > 0) credits+=bullets.length*0.5;
            });

            results.push({
                date: new Date(d), // Store the current date
                creditsUsed: credits
            });
            
            totalCreditsUsed+=credits
        }

        return res.status(200).json({results,totalCreditsUsed});
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Server error." });
    }
};