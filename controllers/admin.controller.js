import fs from 'fs'
import {User} from '../models/user.model.js'

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

        const {
            titleCharacters,
            bulletNum,
            bulletCharacters,
            descriptionCharacters
        } = req.body
    
        const obj = JSON.parse(fs.readFileSync('rules.json', 'utf8'));
    
        obj.titleCharacters = titleCharacters
        obj.bulletNum = bulletNum
        obj.bulletCharacters = bulletCharacters
        obj.descriptionCharacters = descriptionCharacters
    
        fs.writeFileSync('rules.json', JSON.stringify(obj, null, 2), 'utf8');

        res.status(200).send({ message: 'Rules updated successfully' });

    } catch (error) {

        console.error('Error updating rules:', error);
        res.status(500).send({ message: 'Error updating rules' });
        
    }

}

/*
const fs = require('fs').promises;

async function readJsonFile(filepath) {
    try {
        // Read the file content asynchronously
        const data = await fs.readFile(filepath, 'utf8');
        
        // Parse the JSON content
        const jsonData = JSON.parse(data);
        
        return jsonData;
    } catch (err) {
        console.error("Error reading or parsing the file:", err);
        return null;
    }
}

async function writeJsonFile(filepath, jsonData) {
    try {
        // Convert the JSON object to a string
        const data = JSON.stringify(jsonData, null, 2);
        
        // Write the string to the file asynchronously
        await fs.writeFile(filepath, data, 'utf8');
    } catch (err) {
        console.error("Error writing to the file:", err);
    }
}

async function alterJsonFile(filepath, newValues) {
    try {
        // Read the existing JSON file
        const jsonData = await readJsonFile(filepath);
        
        if (jsonData) {
            // Alter the values in the JSON object
            Object.keys(newValues).forEach(key => {
                if (jsonData.hasOwnProperty(key)) {
                    jsonData[key] = newValues[key];
                }
            });
            
            // Write the updated JSON object back to the file
            await writeJsonFile(filepath, jsonData);
        }
    } catch (err) {
        console.error("Error altering the JSON file:", err);
    }
}

// Example usage
const filepath = '/abc';
const newValues = {
    titleCharacters: 150,
    bulletNum: 10,
    bulletCharacters: 120,
    descriptionCharacters: 600
};

alterJsonFile(filepath, newValues)
    .then(() => {
        console.log("JSON file has been updated.");
    });
*/
