import fs from 'fs'
import {User} from '../models/user.model.js'
import Joi from 'joi';

export const getAllUsers = async (req, res) => {
    try {

        const result = await User.find().select("-password -refreshToken -__v");
        console.log(result);
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
            console.log("ID must be string");
            return res.status(401).json({ message: "ID must be string" });
        }
        const user = await User.findById(userId);
        if (!user) {
            console.log("user does not exist");
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
    const newWord = req.body.word;
    if (!newWord) {
        return res.status(400).json({ error: 'No word provided' });
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
        })

        const {
            titleCharacters,
            bulletNum,
            bulletCharacters,
            descriptionCharacters
        } = req.body

        const {error} = rulesjoi.validate(req.body, { abortEarly: false });

        if (error){
            return res.status(400).json({message:"incorrect values"})
        }
    
        const obj = JSON.parse(fs.readFileSync('rules.json', 'utf8'));
    
        obj.titleCharacters = Number(titleCharacters || obj.titleCharacters)
        obj.bulletNum = Number(bulletNum || obj.bulletNum)
        obj.bulletCharacters = Number(bulletCharacters || obj.bulletCharacters)
        obj.descriptionCharacters = Number(descriptionCharacters || obj.descriptionCharacters)
    
        fs.writeFileSync('rules.json', JSON.stringify(obj, null, 2), 'utf8');

        res.status(200).send({ message: 'Rules updated successfully' });

    } catch (error) {

        console.error('Error updating rules:', error);
        res.status(500).send({ message: 'Error updating rules' });
        
    }

}

export const getRules = async (req,res)=>{
    try{
        const obj = JSON.parse(fs.readFileSync('rules.json', 'utf8'));
        res.status(200).json(obj)
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"something went wrong, please try again or contact support"})
    }
}

export const getTotalUsers = async (req,res)=>{
    try{
        const users = User.find({role:"user",active:true})
        res.status(200).json({users})
    }catch(err){
        return res.status(500).json({message:"something went wrong, please try again or contact support"})
    }
}