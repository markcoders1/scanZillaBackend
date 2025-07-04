import fs from "fs/promises";
import { User } from "../models/user.model.js";
import Joi from "joi";
import { History } from "../models/history.model.js";
import { Offer } from "../models/offers.model.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import path from "path";
import { fileURLToPath } from "url";
import { createAssistant, purgeAssistant, updatefunc, backupInstructions, updatefuncDos, updatefuncDonts } from "../services/AIService.js";
import { transporterConstructor } from "../utils/email.js";
export { getModels } from "../services/ai.code.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devTransporter = transporterConstructor(process.env.DEV_EMAIL,process.env.DEV_PASS)
const clientMailTransporter = transporterConstructor(process.env.APP_EMAIL,process.env.APP_PASS)

const clientErrorMailConstructor = (humanError,error) => {
    return {
        to: process.env.APP_EMAIL,
        subject: "Error Alert",
        text: `
        something crashed:
        
        ${humanError}


        ${error}
        
        `,
    }
}
const errorMailConstructor = (humanError,error) => {
    return {
        to: "haris.markcoders@gmail.com",
        subject: "Error Alert",
        text: `
        something crashed:
        
        ${humanError}


        ${error}
        
        `,
    }
}
let zodSchema = {}
zodSchema.title = z.object({
    // titleErrors: z.array(z.string())
    titleErrors: z.array(
        z.object({
            error: z.string(),
            priority: z.enum(["low", "medium", "high"]),
        })
    ),
});

zodSchema.description = z.object({
    // descriptionErrors: z.array(z.string()),
    descriptionErrors: z.array(
        z.object({
            error: z.string(),
            priority: z.enum(["low", "medium", "high"]),
        })
    ),
});

zodSchema.bullets = z.object({
    // bulletPointErrors:z.array(z.string()),
    bulletPointErrors: z.array(
        z.object({
            point: z.number(),
            error: z.string(),
            priority: z.enum(["low", "medium", "high"]),
        })
    ),
});

const responseValidatorSchema = z.object({
    TE:z.array(
        z.object({
            error:z.string(),
            priority:z.enum(["low","medium","high"])
        })
    ),
    DE:z.array(
        z.object({
            error:z.string(),
            priority:z.enum(["low","medium","high"])
        })
    ),
    BE:z.array(
        z.object({
            point:z.number(),
            error:z.string(),
            priority:z.enum(["low","medium","high"])
        })
    ),
    KE:z.array(
        z.object({
            error:z.string(),
            priority:z.enum(["low","medium","high"])
        })
    ),
    abuse:z.boolean()
});

dotenv.config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const openai = new OpenAI(process.env.OPENAI_API_KEY);

export const getAllUsers = async (req, res) => {
    try {
        const result = await User.find().select("-password -refreshToken -__v");
        return res.status(200).json(result);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("get all users",err))
        res.status(400).json({ error });
    }
};

export const toggleUserAccount = async (req, res) => {
    try {
        let { userId } = req.query;

        const user = await User.findById(userId);
        user.active = !user.active;
        await user.save();
        return res.status(200).json({ message: "user account toggled successfully" });
    } catch (err) {
        devTransporter.sendMail(errorMailConstructor("toggle user account",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
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
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("get user",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(400).json({ error });
    }
};

export const changeRules = async (req, res) => {
    try {
        const rulesjoi = Joi.object({
            titleCharacters: Joi.number().min(0).message("Incorrect value."),
            bulletNum: Joi.number().min(0).message("Incorrect value."),
            bulletCharacters: Joi.number().min(0).message("Incorrect value."),
            descriptionCharacters: Joi.number().min(0).message("Incorrect value."),
            creditCost: Joi.number().min(0).message("Incorrect value."),
            characterCost: Joi.number().min(0).message("Incorrect value."),
            category: Joi.string().min(0),
            totalBulletsLength: Joi.number().min(0).message("Incorrect value."),
            searchTerms: Joi.number().min(0).message("Incorrect value."),
        });

        const { titleCharacters, bulletNum, bulletCharacters, descriptionCharacters, creditCost, characterCost, category, totalBulletsLength, searchTerms } = req.body;

        const { error } = rulesjoi.validate(req.body, { abortEarly: false });

        if (titleCharacters && !category) {
            return res.status(400).json({ message: "Enter the category you want to set a title limit on." });
        }

        if (error) {
            console.log(error.details);
            return res.status(400).json({ message: "Incorrect values." });
        }

        const obj = JSON.parse(await fs.readFile("json/rules.json", "utf8"));

        // obj.titleCharacters = Number(titleCharacters || obj.titleCharacters)
        obj.bulletNum = Number(bulletNum || obj.bulletNum);
        obj.bulletCharacters = Number(bulletCharacters || obj.bulletCharacters);
        obj.descriptionCharacters = Number(descriptionCharacters || obj.descriptionCharacters);
        obj.creditCost = Number(creditCost || obj.creditCost);
        obj.characterCost = Number(characterCost || obj.characterCost);
        obj[category] = Number(titleCharacters || obj[category]);
        obj.totalBulletsLength = Number(totalBulletsLength || obj.totalBulletsLength);
        obj.searchTerms = Number(searchTerms || obj.searchTerms);

        await fs.writeFile("json/rules.json", JSON.stringify(obj, null, 2), "utf8");

        res.status(200).send({ message: "Rules updated successfully." });
    } catch (err) {
        console.error("Error updating rules:", err);
        devTransporter.sendMail(errorMailConstructor("change rules",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).send({ message: "Error updating rules." });
    }
};

export const getTotalUsers = async (req, res) => {
    try {
        const users = await User.countDocuments({ role: "user", active: true });
        res.status(200).json({ users });
    } catch (err) {
        devTransporter.sendMail(errorMailConstructor("get total users",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again or contact support." });
    }
};

export const getUserPurchases = async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findById(userId);

        let payments = [];

        if (user.customerId) {
            const charges = await stripe.charges.list({ customer: user.customerId });

            payments = charges.data.map((e) => {
                return { currency: e.currency, amount: e.amount, credits: e.metadata.credits, date: e.created };
            });
        }

        return res.status(200).json({ success: true, payments });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const getUserHistory = async (req, res) => {
    try {
        const { userId } = req.query;
        const Histories = await History.find({ userID: userId }).sort({ createdAt: -1 });
        res.status(200).json(Histories);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const getIncome = async (req, res) => {
    try {
        let charges = [];
        let hasMore = true;
        let lastId = null;
        let now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
        const start = Date.now();

        while (hasMore) {
            let response;

            if (lastId) {
                response = await stripe.charges.list({ created: { gte: startOfMonth }, limit: 100, starting_after: lastId });
            } else {
                response = await stripe.charges.list({ created: { gte: startOfMonth }, limit: 100 });
            }

            charges = charges.concat(response.data);
            hasMore = response.has_more;
            if (hasMore) {
                lastId = response.data[response.data.length - 1].id;
            }
        }

        let graphdata = charges.map((e) => {
            let datecreated = new Date(e.created * 1000);
            return { amount: e.amount, createdAt: datecreated.getDate() };
        });

        let aggregatedData = graphdata.reduce((acc, curr) => {
            if (!acc[curr.createdAt]) {
                acc[curr.createdAt] = 0;
            }
            acc[curr.createdAt] += curr.amount;
            return acc;
        }, {});

        let latestDate = Math.max(...graphdata.map((item) => item.createdAt));
        let result = [];

        for (let i = 1; i <= latestDate; i++) {
            result.push({ amount: aggregatedData[i] || 0, createdAt: i });
        }

        charges = graphdata.map((e) => e.amount);

        let value = charges.reduce((a, b) => a + b, 0);
        value = value / 100;
        value = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        res.status(200).json({ value, result });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const changeOfferPricing = async (req, res) => {
    try {
        const offerJoi = Joi.object({
            variant: Joi.number().min(-1),
            amount: Joi.number().min(0),
            name: Joi.string().min(0).max(20),
            buttonText: Joi.string().min(0),
            description: Joi.string(),
            credits: Joi.number().min(0),
        });

        const { error } = offerJoi.validate(req.body);
        if (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: "Data Invalid" });
        }

        let { variant, amount, name, buttonText, credits, description } = req.body;

        amount = amount * 100;
        const offer = await Offer.findOne({ variant });
        offer.amount = amount || offer.amount;
        offer.name = name || offer.name;
        offer.buttonText = buttonText || offer.buttonText;
        offer.credits = credits || offer.credits;
        offer.description = description || offer.description;

        offer.save();

        res.status(200).json({ success: true });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const giveUserCredits = async (req, res) => {
    try {
        let { userId, credits } = req.body;

        if (!userId || !credits) {
            return res.status(400).json({ message: "Values not found." });
        }

        const user = await User.findById(userId);

        credits = Number(credits);

        user.credits += credits;
        user.save();

        return res.status(200).json({ success: true, userCredits: user.credits, message: `You have successfully sent ${credits} credits to user: ${user.userName}` });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const takeUserCredits = async (req, res) => {
    try {
        let { userId, credits } = req.body;

        if (!userId || !credits) {
            return res.status(400).json({ message: "Values not found." });
        }

        const user = await User.findById(userId);

        credits = Number(credits);

        if (credits > user.credits) {
            user.credits = 0;
        } else {
            user.credits -= credits;
        }
        user.save();

        return res.status(200).json({ success: true, userCredits: user.credits, message: `You have successfully removed ${credits} credits from user: ${user.userName}` });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const analysisgraph = async (req, res) => {
    try {
        const now = new Date();
        const disMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        let histories = await History.find({ createdAt: { $gte: disMonth } }).sort({ createdAt: -1 });
        histories = histories.map((e) => {
            const date = new Date(e.createdAt);
            return date.getDate();
        });
        histories.push(0);

        const maxNumber = [...new Set(histories)].sort((a, b) => b - a)[0];
        const counts = Array(maxNumber).fill(0);

        histories.forEach((num) => {
            counts[num - 1]++;
        });

        const result = counts.map((count, index) => ({
            date: index + 1,
            analysis: count,
        }));

        res.status(200).json(result);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const getAssInstructions = async (req, res) => {
    try {
        const instructions = JSON.parse(await fs.readFile("json/AI.rules.json", "utf8"));
        res.status(200).json({ title: instructions.title, description: instructions.description, bullets: instructions.bullets });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const updateAssInstructions = async (req, res) => {
    try {
        const { titleDo, titleDont, descriptionDo, descriptionDont, bulletsDo, bulletsDont } = req.body;
        let instructions = await backupInstructions(titleDo, titleDont, descriptionDo, descriptionDont, bulletsDo, bulletsDont);

        const updates = [];
        if (titleDo || titleDont || true) {
            updates.push(updatefunc("asst_Pt5hHWrKSBhRpG2HujTTGAPS", "title", zodSchema.title,instructions));
        }
        if (descriptionDo || descriptionDont || true) {
            updates.push(updatefunc("asst_6XjxcgjvaKIEzX9jHYb0f8BX", "description", zodSchema.description,instructions));
        }
        if (bulletsDo || bulletsDont || true) {
            updates.push(updatefunc("asst_BZVT36g8vtZn9pF8tyfW04zP", "bullets", zodSchema.bullets,instructions));
        }
        const update = await Promise.all(updates);
        console.log("update");

        return res.status(200).json({ success: true, message: "AI rules changed successfully", update });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

export const updateAssInstructionsV2 = async (req,res) =>{
    const { titleDo, titleDont, descriptionDo, descriptionDont, bulletsDo, bulletsDont } = req.body;
    const instructions = await backupInstructions(titleDo, titleDont, descriptionDo, descriptionDont, bulletsDo, bulletsDont);
    
    const fields = ["title", "description", "bullets"];
    const assistants = JSON.parse(await fs.readFile("json/assistants.json", "utf8"));
    
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        let numDoInstructions = instructions[field].Dos.length
        let numDontInstructions = instructions[field].Donts.length
        let numDoAssistants = Math.ceil( numDoInstructions / 3);
        let numDontAssistants = Math.ceil(numDontInstructions / 3)

        console.log(assistants[field])
    
        assistants[field].forEach(e => purgeAssistant(e, field));
    
        assistants[field] = [];
        let assistantIndex = 0
        for (let k = 0; k < numDoAssistants ; k++) {
            let assistant = await createAssistant(field, k + 1, " do");
            assistants[field].push(assistant.id);
        }
        for (let k = 0; k < numDontAssistants; k++) {
            let assistant = await createAssistant(field, k + 1," don't");
            assistants[field].push(assistant.id);
        }


        await fs.writeFile("json/assistants.json", JSON.stringify(assistants, null, 2), "utf8");

        for (let k = 0; k < numDoAssistants; k++) {
            await updatefuncDos(assistants[field][k],field,zodSchema[field],instructions[field].Dos.slice(k*3,k*3+3),instructions.fixed)
        }
        for (let k = 0; k < numDontAssistants; k++) {
            await updatefuncDonts(assistants[field][numDoAssistants+k],field,zodSchema[field],instructions[field].Donts.slice(k*3,k*3+3),instructions.fixed)
        }
    }

    return res.status(200).json({success:true,message:"AI rules changed successfully",assistants})
}

export const updateAssistantValidator = async (req,res) => {
    try{
        const assId = "asst_ITq8VRILS0QQi8AagLmEAgjJ"
        const {fixed,rules,formats} = req.body
        const instructions = JSON.parse(await fs.readFile("json/AI-filter.rules.json", "utf8"));

        instructions.fixed = fixed  || instructions.fixed
        instructions.rules = rules  || instructions.rules
        instructions.formats = formats || instructions.formats
        

        await fs.writeFile("json/AI-filter.rules.json", JSON.stringify(instructions, null, 2), "utf8");

        const updatefunc = async () => {
            return await openai.beta.assistants.update(assId, {
                instructions: `${instructions.fixed} || RULES: RULE ${instructions.rules.join(" RULE ")} || FORMATS: FORMAT ${instructions.formats.join(" FORMAT ")}`,
                response_format: zodResponseFormat(responseValidatorSchema, `assistantValidator`),
                model: "gpt-4o-2024-08-06",
                temperature: 0.2,
            });
        };

        const assistant = await updatefunc()

        return res.status(200).json({ success: true, message: "AI rules changed successfully",assistant });
    }catch(err){
        console.log(err)
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(200).json({success:false,message:"could not update the assistant validator"})
    }
}

export const makeAdmin = async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findById(userId);
        if(user._id.toString()==req.user.id){
            return res.status(200).json({success:false,message:"you can't remove your own admin access"})
        }
        user.role == "user" ? (user.role = "admin") : (user.role = "user");
        user.save();
        res.status(200).json({ success: true, message: `user toggled ${user.role} successfully`, role: user.role });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Something went wrong, Please try again later or contact support." });
    }
};

const getWordsFromFile = async (filepath) => {
    try {
        let path = filepath || "BW1242.csv";
        const fileContent = await fs.readFile(path);
        const words = parse(fileContent).map((row) => row[0]);
        return words;
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        throw new Error("Failed to read words from file");
    }
};

const writeWordsToFile = async (words) => {
    try {
        const data = stringify(words.map((word) => [word]).sort());
        await fs.writeFile("BW1242.csv", data, (err) => {
            if (err) console.log(err);
        });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        throw new Error("Failed to write words to file");
    }
};

export const getWords = async (req, res) => {
    try {
        const words = await getWordsFromFile("BW1242.csv");
        res.status(200).json(words);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ error: "Failed to read words from file" });
    }
};

export const addWords = async (req, res) => {
    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty": "Word cannot be null",
        "string.min": "Word must contain atleast 1 character",
        "any.required": "Word is required",
    });
    const newWord = req.body.word;
    const { error } = wordjoi.validate(newWord);

    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
        const words = await getWordsFromFile();
        if (words.includes(newWord)) {
            return res.status(400).json({ success: false, message: "Word already exists." });
        }
        words.push(newWord);
        words.sort();
        await writeWordsToFile(words);
        return res.status(201).json({ success: true, message: "Word added successfully.", words });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ error: "Failed to add word to file." });
    }
};

export const removeWords = async (req, res) => {
    const wordToRemove = req.query.word;

    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty": "Word cannot be null.",
        "string.min": "Word must contain atleast 1 character.",
        "any.required": "Word is required.",
    });

    const { error } = wordjoi.validate(wordToRemove);

    if (error) {
        return res.status(400).json({ success: false, message: "Word Invalid." });
    }

    try {
        let words = await getWordsFromFile();
        words = words.filter((word) => word !== wordToRemove);
        await writeWordsToFile(words);
        res.status(200).json({ message: "Word removed successfully" });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ error: "Failed to remove word from file" });
    }
};

export const uploadCsv = async (req, res) => {
    try {
        if (req.file.mimetype !== "text/csv" || !req.file) {
            return res.status(400).json({ message: "Incorrect Filetype or No file uploaded.", success: false });
        }

        const allowedDir = path.resolve(__dirname, "./..");

        const filePath = path.resolve(req.file.path);
        if (!filePath.startsWith(allowedDir)) {
            // Delete the potentially malicious file
            await fs.rm(filePath, { force: true });
            return res.status(400).json({ message: "Invalid file path.", success: false });
        }

        let words = await getWordsFromFile(filePath);
        await fs.rm(filePath, { force: true });
        words = words.map((word) => word?.toLowerCase()).filter(Boolean);
        words = [...new Set(words)];

        const sanitizeWord = (word) => {
            return word.replace(/[.*+?^${}()|[\]\\]/g, "");
        };

        words = words.map(sanitizeWord).filter((word) => word.length > 0);

        await writeWordsToFile(words);

        res.status(200).json({ message: "Uploaded CSV successfully.", words });
    } catch (err) {
        console.error("Error uploading CSV:", err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ message: "Internal server error.", success: false });
    }
};

export const downloadCsv = async (req, res) => {
    try {
        res.download("./BW1242.csv");
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
    }
};

const writeAbbWordsToFile = async (words) => {
    try {
        const data = stringify(words.map((word) => [word.toUpperCase()]).sort());
        await fs.writeFile("AA1242.csv", data, (err) => {
            if (err) console.log(err);
        });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        throw new Error("Failed to write words to file");
    }
};

export const getAbbWords = async (req, res) => {
    try {
        const words = await getWordsFromFile("AA1242.csv");
        res.status(200).json(words);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ error: "Failed to read words from file." });
    }
};

export const addAbbWords = async (req, res) => {
    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty": "Word cannot be null",
        "string.min": "Word must contain atleast 1 character.",
        "any.required": "Word is required.",
    });
    const newWord = req.body.word;
    const { error } = wordjoi.validate(newWord);

    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
        const words = await getWordsFromFile("AA1242.csv");
        if (words.includes(newWord.toUpperCase())) {
            return res.status(400).json({ success: false, message: "Word already exists." });
        }
        words.push(newWord.toUpperCase());
        words.sort();
        await writeAbbWordsToFile(words);
        return res.status(201).json({ success: true, message: "Word added successfully.", words });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ error: "Failed to add word to file." });
    }
};

export const removeAbbWords = async (req, res) => {
    const wordToRemove = req.query.word;

    const wordjoi = Joi.string().min(1).required().max(100).label("word").messages({
        "string.empty": "Word cannot be null.",
        "string.min": "Word must contain atleast 1 character.",
        "any.required": "Word is required.",
    });

    const { error } = wordjoi.validate(wordToRemove);

    if (error) {
        return res.status(400).json({ success: false, message: "Word Invalid" });
    }

    try {
        let words = await getWordsFromFile("AA1242.csv");
        words = words.filter((word) => word !== wordToRemove.toUpperCase());
        await writeAbbWordsToFile(words);
        res.status(200).json({ message: "Word removed successfully." });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ error: "Failed to remove word from file." });
    }
};

export const uploadAbbCsv = async (req, res) => {
    try {
        if (req.file.mimetype !== "text/csv" || !req.file) {
            return res.status(400).json({ message: "Incorrect Filetype or No file uploaded.", success: false });
        }

        const allowedDir = path.resolve(__dirname, "./..");

        const filePath = path.resolve(req.file.path);
        if (!filePath.startsWith(allowedDir)) {
            // Delete the potentially malicious file
            await fs.rm(filePath, { force: true });
            return res.status(400).json({ message: "Invalid file path.", success: false });
        }

        let words = await getWordsFromFile(filePath);
        await fs.rm(filePath, { force: true });
        words = words.map((word) => word?.toLowerCase()).filter(Boolean);
        words = [...new Set(words)];

        const sanitizeWord = (word) => {
            return word.replace(/[.*+?^${}()|[\]\\]/g, "");
        };

        words = words.map(sanitizeWord).filter((word) => word.length > 0);

        await writeAbbWordsToFile(words);

        res.status(200).json({ message: "Uploaded CSV successfully.", words });
    } catch (err) {
        console.error("Error uploading CSV:", err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        res.status(500).json({ message: "Internal server error.", success: false });
    }
};

export const downloadAbbCsv = async (req, res) => {
    try {
        res.download("./AA1242.csv");
    } catch (err) {
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        console.log(err);
    }
};

export const creditsUsed = async (req, res) => {
    try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); // First day of the current month
        const today = new Date();
        const results = [];
        let totalCreditsUsed = 0;

        // Loop through each day of the current month only
        for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);

            // Find records created on this specific day, within the current month
            const dailyAnalysis = await History.find({
                createdAt: { $gte: d, $lt: nextDay },
            }).sort({ createdAt: -1 }).lean();

            let credits = 0;
            dailyAnalysis.forEach(({ title, description, bullets }) => {
                if (title.length >= 0) credits++;
                if (description.length > 0) credits++;
                if (bullets.length > 0) credits += bullets.length * 0.5;
            });

            results.push({
                date: new Date(d), // Store the current date
                creditsUsed: credits,
            });

            totalCreditsUsed += credits;
        }

        return res.status(200).json({ results, totalCreditsUsed });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ error: "Server error." });
    }
};

export const createAssistants = async (req, res) => {
    try {
        const assistant = await createAssistant();
        return res.status(200).json({ success: true, message: "assistant created successfully", assistant });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ error: "Server error." });
    }
};

export const getAssistants = async (req, res) => {
    try {
        let assistants = await openai.beta.assistants.list();
        assistants = assistants.body.data
        let nullAssistants = assistants.filter(e=>e.instructions==null).map(e=>({id:e.id,ins:e.instructions}))
        return res.status(200).json(assistants);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ error: "Server error." });
    }
};

export const checkAssistant = async (req,res) => {
    try{
        const {assistantId} = req.query;
        const assistant = await openai.beta.assistants.retrieve(assistantId);
        return res.status(200).json({success:true,assistant})
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const deleteAssistant = async (req,res) => {
    try{
        const {assistantId} = req.query;
        await purgeAssistant(assistantId);
        return res.status(200).json({success:true,message:"Assistant deleted successfully"})
    }catch(err){
        console.log(err)
        return res.status(500).json({message:"Something went wrong, Please try again later or contact support."})
    }
}

export const getThread = async (req,res) => {
    try{
        let thread = await openai.beta.threads.messages.list(req.body.thread);
        
        return res.status(200).json({thread})
    }catch(err){
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ error: "Server error." });
    }
}

export const deleteUserAccount = async (req, res) => {
    try {
        const document = await User.findByIdAndUpdate(req.params.id, {
            userName:"deletedUser",
            credits:0,
            active:false,
            email:`${req.params.id}@example.com`
        }, { new: true, runValidators: true });
        if (!document) return res.status(404).json({ success: false, error: "Document not found" });
        res.status(200).json({ success: true, data: document });
    } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, error: error.message });
    }
};