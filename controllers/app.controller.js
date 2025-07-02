import Joi from "joi";
import dotenv from "dotenv";
import fs from "fs/promises";
import { History } from "../models/history.model.js";
import Stripe from "stripe";
import { User } from "../models/user.model.js";
import { ProcessedEvent } from "../models/webhook.model.js";
import { Offer } from "../models/offers.model.js";
import { transporterConstructor } from "../utils/email.js";
import { analyzeValue,reAnalyzeValue,wordReplacer } from "../services/AIService.js";
import { mergeObjects } from "../utils/functions.js";
import { findInvalidCharacters } from "../utils/customChecks.js";
import { 
    checkLengthMessage,
    checkWordsMessage,
    checkWordsCapMessage,
    checkRepeatedWordsMessage,
    checkBulletFlag,
    punctuationError,
    checkDemographic,
    checkHoliday 
} from "../utils/stringChecks.js";
import axios from "axios";
import { joiCreator } from "../services/joiService.js";

const transporter = transporterConstructor(process.env.APP_EMAIL, process.env.APP_PASS);
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

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const obj = JSON.parse(await fs.readFile("json/rules.json", "utf8"));

const paymentEmailJoi = Joi.object({
    name: Joi.string().required().min(2),
    credits: Joi.number().min(0),
    paymentDetails: Joi.string().required(),
    variant: Joi.number(),
});

const supportEmailJoi = Joi.object({
    content: Joi.string().required(),
});

export const verifyText = async (req, res) => {
    try {
        let { title, description, bulletpoints, keywords, category } = req.body;
        let initCategory = category;
        let ai = true;
        let active = true;
        if(!active){
            return res.status(400).json({
                message: "Tool is under maintenance, please try again at a later time",
                success: false,
            });
        }

        if (!category) return res.status(400).json({ success: false, message: "Category is required" });
        if (!Object.keys(obj).includes(category)) {
            category = "Other";
        }

        const verifyTextJoi = await joiCreator(initCategory,category)

        bulletpoints = bulletpoints.map((e) => {
            return e.value;
        });

        bulletpoints = bulletpoints.filter((e) => e);

        title = title.replace(/[\x00-\x1F]/g, "");
        description = description.replace(/[\x00-\x1F]/g, "");
        bulletpoints = bulletpoints.map((e) => e.replace(/[\x00-\x1F]/g, ""));
        keywords = keywords.replace(/[\x00-\x1F]/g, "");
        category = category.replace(/[\x00-\x1F]/g, "");

        title = title.trim()
        description = description.trim()
        bulletpoints = bulletpoints.map(e=>e.trim())
        keywords = keywords.trim()

        const calcStringCost = (stringToCalc) => (stringToCalc ? 1 : 0);

        const creditPrice = calcStringCost(title) + calcStringCost(description) + bulletpoints.length * 0.5 + calcStringCost(keywords);

        let user = await User.findOne({ email: req.user.email });

        if (user.credits < creditPrice) {
            if (user.autocharge == true) {
                const paymentMethods = await stripe.customers.listPaymentMethods(req.user.customerId);
                const paymentId = paymentMethods.data[0].id;

                if (!paymentId) {
                    return res.status(400).json({
                        message: "No Payment Method Detected, add credits, or add payment method",
                        success: false,
                    });
                }

                const offer = await Offer.findOne({ variant: -1 });

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: user.preferredCredits * offer.amount,
                    currency: "usd",
                    customer: req.user.customerId,
                    payment_method: paymentId,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        variant: -1,
                        credits: user.preferredCredits,
                    },
                });

                user = await User.findOne({ email: req.user.email });

                if (user.credits + user.preferredCredits < creditPrice) {
                    return res.status(400).json({
                        message: "Your Auto Credits are not enough to cover for this analyzation, Please recharge",
                        success: false,
                        error: {},
                    });
                }
            } else {
                return res.status(400).json({
                    message: "Not enough credits, please recharge",
                    success: false,
                    error: {},
                });
            }
        }

        user.credits -= creditPrice;
        user.save();

        const { error } = verifyTextJoi.validate({ title, description, bulletpoints, keywords, category }, { abortEarly: false });

        let errObj = {
            TE: [],
            DE: [],
            BE: [],
            KE: [],
            CE: [],
        };

        if (error) {
            error.details.forEach((field) => {
                const fieldKeyMap = {
                    title: "TE",
                    description: "DE",
                    bulletpoints: "BE",
                    keywords: "KE",
                    category: "CE",
                };
                const fieldKey = fieldKeyMap[field.path[0]];

                if (field.type === "string.pattern.base") {
                    const invalidChars = findInvalidCharacters(field.context.value, field.context.regex);
                    field.message = `${field.message}: ${invalidChars}`;
                }

                if (field.path[0] == "bulletpoints") {
                    let priorityToSet = "medium";
                    let send = false;
                    if (checkLengthMessage(field.message)) {
                        priorityToSet = "high";
                    } else if (checkWordsMessage(field.message)) {
                        priorityToSet = "high";
                        send = true;
                    } else if (checkRepeatedWordsMessage(field.message)) {
                        priorityToSet = "high";
                    } else if (checkWordsCapMessage(field.message)) {
                        priorityToSet = "low";
                    }else if (checkBulletFlag(field.message)){
                        priorityToSet = "high"
                    }else if(punctuationError(field.message)){
                        priorityToSet = "low"
                    }else if(checkDemographic(field.message)){
                        priorityToSet = "high"
                    }

                    errObj[fieldKey].push({
                        point: field.path[1] + 1 || -1,
                        error: field.message,
                        priority: priorityToSet,
                        send,
                    });
                } else {
                    errObj[fieldKey].push(field.message);
                }
            });
        }

        // setting an error object and priority for all errors
        Object.keys(errObj).forEach((key) => {
            errObj[key].forEach((item, index) => {
                if (typeof item == "string") {
                    if (checkLengthMessage(item)) {
                        errObj[key][index] = {
                            error: item,
                            priority: "high",
                            send: false,
                        };
                    } else if (checkWordsMessage(item)) {
                        errObj[key][index] = {
                            error: item,
                            priority: "high",
                            send: false,
                        };
                    } else if (checkWordsCapMessage(item)) {
                        errObj[key][index] = {
                            error: item,
                            priority: "low",
                            send: false,
                        };
                    } else if (checkRepeatedWordsMessage(item)) {
                        errObj[key][index] = {
                            error: item,
                            priority: "high",
                            send: false,
                        };
                    } else if (checkBulletFlag(item)) {
                        errObj[key][index] = {
                            error: item,
                            priority: "high",
                            send: false,
                        };
                    } else if (punctuationError(item)) {
                        errObj[key][index] = {
                            error: item,
                            priority: "low",
                            send: false,
                        };
                    } else if (checkDemographic(item)) {
                        errObj[key][index] = {
                            error: item,
                            priority: "high",
                            send: false,
                        };
                    }else if(checkHoliday(item)){
                        errObj[key][index] = {
                            error: item,
                            priority: "high",
                            send: false,
                        };
                    } else {
                        errObj[key][index] = {
                            error: item,
                            priority: "medium",
                            send: false,
                        };
                    }
                }
            });
        });

        //head if a field's key-value pair in errObj does not exist, add it using the analyzeValue() function

        const errors = [];

        if(ai === true){
            if (title !== "") {
                let titleIds = JSON.parse(await fs.readFile("json/assistants.json", "utf8"))["title"];
                for(let i = 0; i < titleIds.length; i++){
                    errors.push(analyzeValue(title, "title", titleIds[i]));
                }
            }
            if (description !== "") {   
                let descriptionIds = JSON.parse(await fs.readFile("json/assistants.json", "utf8"))["description"];
                for(let i = 0; i < descriptionIds.length; i++){
                    errors.push(analyzeValue(description, "description", descriptionIds[i]));
                }
            }
            if (bulletpoints.length > 0 && bulletpoints[0] !== "") {
                let bulletsIds = JSON.parse(await fs.readFile("json/assistants.json", "utf8"))["bullets"];
                for(let i = 0; i < bulletsIds.length; i++){
                    errors.push(analyzeValue(bulletpoints, "bullets", bulletsIds[i]));
                }
            }
        }

        // Run all promises in parallel using Promise.all
        const parsedMessage = {}; // Initialize parsedMessage

        await Promise.all(errors)
            .then((results) => {
                // Merge the results into parsedMessage
                results.forEach((result) => {
                    parsedMessage[result.assistant] = result.valToSend;
                });
            })
            .catch((error) => {
                // Handle any errors
                console.error("Error processing values:", error);
            });

        const changedObject = {
            TE: "title" in parsedMessage ? parsedMessage.title.map((e) => ({ ...e, send: true })) : [],
            DE: "description" in parsedMessage ? parsedMessage.description.map((e) => ({ ...e, send: true })) : [],
            BE: "bullets" in parsedMessage ? parsedMessage.bullets.map((e) => ({ ...e, send: true })) : [],
        };


        if(Object.keys(parsedMessage).length>0){
            console.log("'\x1b[32m%s\x1b[0m'","messages parsed")
        }

        let mergedObject = mergeObjects(errObj, changedObject);

        // console.log("mergedObject",mergedObject)

        //head reccomendations

        let reccomendations = [];
        if (title && title.length <= 0.9 * obj[category]) {
            reccomendations.push(`Title can be Indexed up to ${obj[category]} for the ${initCategory} category.`);
        }
        if (description && description.length <= 0.9 * obj.descriptionCharacters) {
            reccomendations.push(`Description can be indexed up to ${obj.descriptionCharacters} characters.`);
        }
        let bulletString = "";
        bulletpoints.forEach((e) => (bulletString = bulletString + e));
        let limit = obj.totalBulletsLength*0.9
        if (bulletString.length<limit && bulletString != "") {
            reccomendations.push(`Ensure the total character count for all bullet points combined does not exceed ${obj.totalBulletsLength}, while each individual bullet point remains within the ${obj.bulletCharacters}-character indexing limit.`);
        }
        if (keywords && keywords.length <= 0.9 * obj.searchTerms) {
            reccomendations.push(`Search Terms (Generic Keywords) can be indexed up to ${obj.searchTerms}.`);
        }


        console.log("mergedObject",mergedObject)
        
        let allTrue = {
            TE: mergedObject.TE.filter((obj) => obj.send),
            DE: mergedObject.DE.filter((obj) => obj.send),
            BE: mergedObject.BE.filter((obj) => obj.send),
            KE: mergedObject.KE.filter((obj) => obj.send),
        };
        let allFalse = {
            TE: mergedObject.TE.filter((obj) => !obj.send),
            DE: mergedObject.DE.filter((obj) => !obj.send),
            BE: mergedObject.BE.filter((obj) => !obj.send),
            KE: mergedObject.KE.filter((obj) => !obj.send),
        };

        let aiFilter = {}
        if(ai == true){
            aiFilter = await reAnalyzeValue(allTrue, title, description, bulletpoints, keywords)
        }else{
            aiFilter = allTrue
        }


        // console.log("aiFilter",aiFilter)
        // console.log("allFalse",allTrue)

        let newResponse = mergeObjects(allFalse, aiFilter);



        newResponse = await (async () => {
            // Process each array in parallel
            const [TE, DE, BE, KE] = await Promise.all([
                Promise.all(newResponse?.TE?.map(async (e) => {
                    if (checkWordsMessage(e?.error)) {
                        e.error = await wordReplacer(e.error);
                    }
                    if ("send" in e) {
                        delete e.send;
                    }
                    return e;
                }) || []),
                Promise.all(newResponse?.DE?.map(async (e) => {
                    if (checkWordsMessage(e?.error)) {
                        e.error = await wordReplacer(e.error);
                    }
                    if ("send" in e) {
                        delete e.send;
                    }
                    return e;
                }) || []),
                Promise.all(newResponse?.BE?.map(async (e) => {
                    if (checkWordsMessage(e?.error)) {
                        e.error = await wordReplacer(e.error);
                    }
                    if ("send" in e) {
                        delete e.send;
                    }
                    return e;
                }) || []),
                Promise.all(newResponse?.KE?.map(async (e) => {
                    if (checkWordsMessage(e?.error)) {
                        e.error = await wordReplacer(e.error);
                    }
                    if ("send" in e) {
                        delete e.send;
                    }
                    return e;
                }) || [])
            ]);
        
            return {
                TE,
                DE,
                BE,
                KE,
                abuse: newResponse?.abuse
            };
        })();


        if (title !== "" && newResponse.TE.length === 0) {
            newResponse.TE.push({ error: "No issues found, you're good to go.", priority: "none" });
        }
        if (description !== "" && newResponse.DE.length === 0) {
            newResponse.DE.push({ error: "No issues found, you're good to go.", priority: "none" });
        }
        if (bulletpoints.length > 0 && bulletpoints[0] !== "" && newResponse.BE.length === 0) {
            newResponse.BE.push({ error: "No issues found, you're good to go.", priority: "none", point: "-1" });
        }
        if (keywords !== "" && newResponse.KE.length === 0) {
            newResponse.KE.push({ error: "No issues found, you're good to go.", priority: "none" });
        }

        if (newResponse.abuse) {
            newResponse.TE = [];
            newResponse.BE = [];
            newResponse.DE = [];
            newResponse.KE = [];
        }

        const newHistory = await History.create({
            userID: req.user.id,
            title,
            description,
            bullets: bulletpoints,
            keywords,
            error: newResponse,
            reccomendations,
            credits: creditPrice,
        });

        return res.status(200).json({ message: "Text verified", error: newResponse, reccomendations, success: true });
    } catch (error) {
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter.sendMail(clientErrorMailConstructor("Something went wrong",error))
        console.log(error)
        if (error.code == "authentication_required") {
            return res.status(200).json({ message: "Not enough credits, autopay failed, authentication required", success: false });
        } else {
            return res.status(400).json({ message: "Something went wrong, Please try again or contact support", success: false });
        }
    }
};

export const getUserHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const Histories = await History.find({ userID: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalHistories = await History.countDocuments({
            userID: req.user.id,
        });

        res.status(200).json({
            success: true,
            page,
            limit,
            totalHistories,
            totalPages: Math.ceil(totalHistories / limit),
            Histories,
        });
    } catch (error) {
        console.log(error);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const getUser = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.query.email });
        res.status(200).json({ user });
    } catch (error) {
        console.log(error);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
    }
};

export const buyCredits = async (req, res) => {
    try {
        const { variant, email } = req.body;

        if (!variant || !email) {
            return res.status(400).json({ message: "Data incomplete" });
        }

        const user = await User.findOne({ email: req.user.email });

        if (!user.customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.userName,
            });

            user.customerId = customer.id;
            req.user.customerId = customer.id;
            user.save();
        }

        const offer = await Offer.findOne({ variant });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: offer.amount,
            currency: "usd",
            automatic_payment_methods: {
                enabled: true,
            },
            customer: req.user.customerId,
            metadata: {
                variant,
                credits: offer.credits,
            },
            payment_method_options: {
                card: {
                    setup_future_usage: "off_session",
                },
            },
        });

        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            success: true,
        });
    } catch (error) {
        console.log(error);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
    }
};

export const addPaymentMethod = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });

        if (!user.customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.userName,
            });

            user.customerId = customer.id;
            req.user.customerId = customer.id;
            user.save();
            console.log(user);
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: req.user.customerId,
            automatic_payment_methods: { enabled: true },
        });
        console.log(setupIntent);
        res.status(200).json({
            success: true,
            clientSecret: setupIntent.client_secret,
        });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const BuyCreditWebhook = async (req, res) => {
    try {
        const details = req.body.data.object;
        if (!details || details.object == "charge") {
            return res.status(400).json({ message: "Invalid webhook data" });
        }

        let webhookCall = await ProcessedEvent.findOne({ id: details.id });

        if (webhookCall) {
            return res.status(200).json({ message: "Webhook already called" });
        }
        
        webhookCall = await ProcessedEvent.create({ id: details.id });

        const user = await User.findOne({ customerId: details.customer });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const variant = Number(details.metadata.variant);

        user.credits = Number(user.credits) + Number(details.metadata.credits);
        await user.save();

        return res.status(200).json({ success: true, credits: user.credits });
    } catch (error) {
        console.error(error);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getPurchaseHistory = async (req, res) => {
    try {
        const { customerId } = req.user;
        if (!customerId) {
            return res.status(200).json({ payments: [] });
        }
        const charges = await stripe.charges.list({ customer: customerId });

        let payments = charges.data.map((e) => {
            return {
                id: e.id,
                currency: e.currency,
                amount: e.amount,
                currency: e.currency,
                credits: e.metadata.credits,
                date: e.created,
                status: e.status,
            };
        });

        payments = payments.filter((e) => e.status === "succeeded");

        return res.status(200).json({ success: true, payments });
    } catch (error) {
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
        console.log(error);
    }
};

export const numberOfAnalysed = async (req, res) => {
    try {
        const count = await History.countDocuments({ userID: req.user.id });
        res.status(200).json({ success: true, count });
    } catch (error) {
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
        console.log(error);
    }
};

export const getCardInfo = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });

        console.log(user);

        if (!req.user.customerId) {
            return res.status(200).json({ message: "No customer detected" });
        }
        const paymentMethods = await stripe.customers.listPaymentMethods(req.user.customerId);

        const cards = paymentMethods.data.map((e) => {
            return {
                expMonth: e.card.exp_month,
                expYear: e.card.exp_year,
                last4: e.card.last4,
            };
        });
        res.status(200).json({ cards });
    } catch (error) {
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
        console.log(error);
    }
};

export const toggleAutoCredit = async (req, res) => {
    try {
        const { preferredCredits } = req.query;
        console.log(preferredCredits);
        if (preferredCredits < 0) {
            return res.status(400).json({
                success: false,
                message: "Preferred Credits can not be less than 0",
            });
        }
        const user = await User.findOne({ email: req.user.email });
        const uac = user.autocharge;
        user.autocharge = !user.autocharge;
        user.preferredCredits = preferredCredits;
        user.save();
        return res.status(200).json({
            success: true,
            message: `Auto credits: ${uac ? "off" : "on"}.`,
        });
    } catch (err) {
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        console.log(err);
    }
};

export const getGraphData = async (req, res) => {
    try {
        const userId = req.user.id;
        const histories = await History.find({
            userID: userId,
            createdAt: { $gte: new Date(Date.now() - 15768000000) },
        });

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyCredits = {};

        histories.forEach((history, i) => {
            const month = monthNames[history.createdAt.getMonth()];
            if (!monthlyCredits[month]) {
                monthlyCredits[month] = 0;
            }
            monthlyCredits[month] += history.credits || 0;
        });

        const result = Object.keys(monthlyCredits).map((month) => ({
            name: month,
            credits: monthlyCredits[month],
        }));

        res.status(200).json(result);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
    }
};

export const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find();
        res.status(200).json({ success: true, offers });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({
            message: "Something went wrong, Please try again later or contact support",
        });
    }
};

export const getRules = async (req, res) => {
    try {
        const obj = JSON.parse(await fs.readFile("json/rules.json", "utf8"));
        res.status(200).json(obj);
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({
            message: "Something went wrong, Please try again or contact support",
        });
    }
};

export const paymentEmail = async (req, res) => {
    try {
        const { error } = paymentEmailJoi.validate(req.body);

        if (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: "Invalid data provided" });
        }

        const { name, credits, paymentDetails, variant } = req.body;

        const offer = await Offer.findOne({ variant: variant });

        transporter.sendMail({
            to: "amz@blazecopywriting.com",
            subject: "Payment Request",
            text: `
            
            Sender: ${req.user.email}
            Name: ${name}
            Number of credits Requested: ${variant == 4 ? `${credits}` : offer.credits}
            Variant:${offer.name}
            

            ${paymentDetails}
            
            `,
        });
        res.status(200).json({
            success: true,
            message: "Email sent successfully",
        });
    } catch (error) {
        console.log(error);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
        return res.status(500).json({
            message: "Something went wrong, Please try again or contact support",
        });
    }
};

export const supportEmail = async (req, res) => {
    try {
        const { error } = supportEmailJoi.validate(req.body);

        if (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: "Invalid data provided" });
        }

        const { content } = req.body;
        console.log(req.user);

        transporter.sendMail({
            to: "amz@blazecopywriting.com",
            subject: "Support",
            text: `
            
            Sender: ${req.user.email}
            Name: ${req.user.userName}

            ${content}
            
            `,
        });
        res.status(200).json({
            success: true,
            message: "Email sent successfully",
        });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({
            message: "Something went wrong, Please try again or contact support",
        });
    }
};

export const changeName = async (req, res) => {
    try {
        const { fullName } = req.body;

        const schema = Joi.object({
            fullName: Joi.string().required(),
        });

        const { error } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({ success: false, message: "Invalid data" });
        }

        const user = await User.findOneAndUpdate({ email: req.user.email }, { userName: fullName }, { new: true });

        return res.status(200).json({ success: true, user });
    } catch (err) {
        console.log(err);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",err))
        clientMailTransporter(clientErrorMailConstructor("Something went wrong",err))
        return res.status(500).json({
            message: "Something went wrong, Please try again or contact support",
        });
    }
};

export const asin = async (req, res) => {
    try {
        const { asin } = req.params;
        const asinjoi = Joi.string().required();
        const { error } = asinjoi.validate(asin);
        if (error) {
            return res.status(400).json({ success: false, message: "incorrect ASIN" });
        }
        const url = `https://api.keepa.com/product?key=9eie193sleqlv3u3trmfs8vmub7k76ue4gkobig9uk9fogit8a4hsctoq6kd7lm4&domain=1&asin=${asin}`;
        let result = await axios.get(url);
        if (!result.data.products) {
            return res.status(400).json({ success: false, message: "product not found please try another ASIN code." });
        }
        result = result?.data?.products[0];
        let category;

        const values = await fs.readFile("json/rules.json", "utf-8", null);
        const categories = Object.keys(JSON.parse(values));

        if (result?.categoryTree) {
            category = result?.categoryTree[0]?.name || "";
        } else {
            category = "";
        }

        console.log(category);
        let errorToSend = [];
        if (!result?.title) {
            errorToSend.push("Title");
        }
        if (!result?.description) {
            errorToSend.push("Description");
        }
        if (!result?.features) {
            errorToSend.push("Bullet Points");
        }
        if (category == "") {
            errorToSend.push("category");
        }

        let message = "Values Filled in Successfully";
        if (errorToSend.length > 0) {
            if (errorToSend.length == 1) {
                message = `${errorToSend.pop()} not found.`;
            } else {
                let val = [errorToSend.pop(), errorToSend.pop()];

                message = `${errorToSend.join(", ")}${errorToSend.length > 2 ? ", " : ""}${val[1]} and ${val[0]} not found.`;
            }
        } else {
            message += ".";
        }

        res.status(200).json({ success: true, title: result?.title, description: result?.description, bullets: result?.features, category, message: message });
    } catch (error) {
        console.log(error);
        devTransporter.sendMail(errorMailConstructor("Something went wrong",error))
clientMailTransporter(clientErrorMailConstructor("Something went wrong",error))
        res.status(500).json({ success: false, error: error.message, message: "Value Autofill Failed." });
    }
};
