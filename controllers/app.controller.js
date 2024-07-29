import Joi from "joi"
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from 'fs'
import { History } from "../models/history.model.js";
import Stripe from "stripe";
import { User } from "../models/user.model.js";
import {ProcessedEvent} from "../models/webhook.model.js";
import { Offer } from "../models/offers.model.js";


dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const openai = new OpenAI(process.env.OPENAI_API_KEY)


const assId = "asst_J8gYM42wapsrXpntcCLMe8wJ"
const runId = "run_NtD8Nk9cxGzelSCPf12JXy8l"

const loadBlacklistedWords = () => {
    const data = fs.readFileSync("blacklistedWords.txt", 'utf-8');
    const words = new Set(data.split(/\r?\n/).map(word => word.toLowerCase()));
    return words;
};


const blacklistedWords= loadBlacklistedWords();


function findInvalidCharacters(input,regex) {
    let invalidChars = [];
  
    for (let char of input) {
      if (!regex.test(char) && !invalidChars.includes(char)) {
        invalidChars.push(char);
      }
    }
    return invalidChars.join(' ');
}


const containsBlacklistedWord = (paragraph) => {
    const lowerCaseParagraph = paragraph.toLowerCase();
    let usedWords = [];
    let containsWords = false;

    for (const phrase of blacklistedWords) {
        if (lowerCaseParagraph.includes(phrase.toLowerCase())) {
            usedWords.push(phrase);
            containsWords = true;
        }
    }

    usedWords = [...new Set(usedWords)];
    
    return { containsWords, usedWords };
};

// function detectNumberWords(text) {
//     const singleDigits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
//     const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
//     const tens = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
//     const hundreds = ["hundred"];
//     const thousands = ["thousand"];

//     const allNumberWords = [...singleDigits, ...teens, ...tens, ...hundreds, ...thousands];

//     const lowerText = text.toLowerCase();

//     const numberWordPattern = new RegExp(`\\b(${allNumberWords.join("|")})\\b`, "gi");

//     const matches = lowerText.match(numberWordPattern);

//     return matches !== null;
// }


const obj = JSON.parse(fs.readFileSync('json/rules.json', 'utf8'));


const verifyTextJoi = Joi.object({

    title: Joi.string().custom((value, helper) => {
        const { containsWords, usedWords } = containsBlacklistedWord(value);
        if (containsWords) {
            return helper.message(`this text contains the words: (${usedWords.map(word => " " + word)} ) which are blacklisted`);
        }
        return value;
    }).regex(/^[a-zA-Z0-9,– '.:\-\\/&]*$/).min(0).max(obj.titleCharacters).messages({
        "string.pattern.base": "must be standard ASCII characters or generic symbols"
    }),
  
    description: Joi.string().custom((value, helper) => {
        const { containsWords, usedWords } = containsBlacklistedWord(value);
        if (containsWords) {
            return helper.message(`this text contains the words: (${usedWords.map(word => " " + word)} ) which are blacklisted`);
        }
        return value;
    }).regex(/^[ -~]*$/).min(0).max(obj.descriptionCharacters).messages({
        "string.pattern.base": "must be standard ASCII characters only"
    }),

    bulletpoints: Joi.array().items(
        Joi.string().allow('').custom((value, helper) => {
            const { containsWords, usedWords } = containsBlacklistedWord(value);
            if (containsWords) {
                return helper.message(`this text contains the words: (${usedWords.map(word => " " + word)} ) which are blacklisted`);
            }
            return value;
        }).regex(/^[A-Za-z0-9 ,.'\-]*$/).min(0).max(obj.bulletCharacters).messages({
            "string.pattern.base": "must be standard ASCII characters only or generic symbols"
        })
    ).min(0).max(obj.bulletNum).label('bulletpoints').messages({
        "array.base": "bulletpoints must be an array of strings",
        "array.includes": "each bulletpoint must be a valid string according to the specified rules"
    }),

    keywords: Joi.string().custom((value, helper) => {
        const { containsWords, usedWords } = containsBlacklistedWord(value);
        if (containsWords) {
            return helper.message(`this text contains the words: (${usedWords.map(word => " " + word)} ) which are blacklisted`);
        }
        return value;
    }).regex(/^[a-zA-Z0-9,– '.:\-\\/&]*$/).min(0).max(200).messages({
        "string.pattern.base": "must be standard ASCII characters or generic symbols"
    }),

    category: Joi.string().custom((value, helper) => {
        const { containsWords, usedWords } = containsBlacklistedWord(value);
        if (containsWords) {
            return helper.message(`this text contains the words: (${usedWords.map(word => " " + word)} ) which are blacklisted`);
        }
        return value;
    }).regex(/^[a-zA-Z0-9,– '.:\-\\/&]*$/).min(0).max(200).messages({
        "string.pattern.base": "must be standard ASCII characters or generic symbols"
    }),
});

export const verifyText = async (req, res) => {
    try {
        let { title, description, bulletpoints, keywords, category } = req.body;
        bulletpoints=bulletpoints.map(e=>{
            return e.value
        })
        bulletpoints=bulletpoints.filter(e=>e)

        title = title.replace(/[\x00-\x1F]/g, "");
        description = description.replace(/[\x00-\x1F]/g, "");
        bulletpoints = bulletpoints.map(e => e.replace(/[\x00-\x1F]/g, ""));
        keywords = keywords.replace(/[\x00-\x1F]/g, "");
        category = category.replace(/[\x00-\x1F]/g, "");


        let collectiveString=title+description+bulletpoints.join('')+keywords
        // const creditPrice = (Math.ceil(collectiveString.length/obj.characterCost)) * obj.creditCost

        const fullChunks = Math.floor(collectiveString.length / obj.characterCost);
        const partialChunk = collectiveString.length % obj.characterCost;
        const creditPrice = Math.ceil((fullChunks * obj.creditCost) + (partialChunk > 0 ? (partialChunk / obj.characterCost) * obj.creditCost : 0));

        const user=await User.findOne({email:req.user.email})

        if(req.user.credits<creditPrice){

            if (req.user.autocharge==true){

                const paymentMethods = await stripe.customers.listPaymentMethods(req.user.customerId)
                const paymentId = paymentMethods.data[0].id
                if (!paymentId){
                    return res.status(400).json({ message: "Not enough credits, please recharge", success: false });
                }

                const offer = Offer.findOne({variant:-1})

                let credits

                if(user.preferredCredits=0){
                    credits=creditPrice-req.user.credits
                }else{
                    credits=user.preferredCredits
                }

                const paymentIntent = await stripe.paymentIntents.create({
                    amount:(creditPrice-req.user.credits)*offer.amount,
                    currency: 'usd',
                    customer: req.user.customerId,
                    payment_method: paymentId,
                    off_session: true,
                    confirm: true,
                    metadata:{
                        variant:-1,
                        credits
                    }
                });

                if(req.user.credits+user.preferredCredits > creditPrice){
                    return res.status(400).json({ message: "Not enough credits, please recharge", success: false, error:{} });
                }

            }else{
                return res.status(400).json({ message: "Not enough credits, please recharge", success: false, error:{} });
            }
        }

        user.credits-=creditPrice
        user.save()

        const { error } = verifyTextJoi.validate({ title, description, bulletpoints, keywords, category }, { abortEarly: false });

        if (error) {
            let errObj = {
                TE: "",
                DE: "",
                BE: "",
                KE: "",
                CE: ""
            };

            error.details.forEach(field => {
                const fieldKeyMap = {
                    title: 'TE',
                    description: 'DE',
                    bulletpoints: 'BE',
                    keywords: 'KE',
                    category: 'CE'
                };
                const fieldKey = fieldKeyMap[field.path[0]];

                if (field.type === "string.pattern.base") {
                    const invalidChars = findInvalidCharacters(field.context.value, field.context.regex);
                    errObj[fieldKey] = `${field.message}: ${invalidChars}`;
                } else {
                    errObj[fieldKey] = field.message;
                }

            });

            
            const history = await History.create({
                userID:req.user.id,
                title,
                description,
                bullets:bulletpoints,
                error:errObj,
                credits:creditPrice
    
            })



            return res.status(200).json({ error: errObj, success: false });
        }

        const history = await History.create({
            userID:req.user.id,
            title,
            description,
            bullets:bulletpoints,
            error:{},
            credits:creditPrice

        })

        // const {thread_id,id} = await openai.beta.threads.createAndRun({
        //     assistant_id:assId,
        // })
        // console.log("threadId",thread_id)
        // let threadrun=await openai.beta.threads.runs.retrieve(thread_id, id);

        // while (threadrun.status === "running" || threadrun.status === "queued" || threadrun.status === "in_progress") {
        //     console.log("waiting for completion");
        //     await new Promise((resolve) => setTimeout(resolve, 1000));
        //     threadrun = await openai.beta.threads.runs.retrieve(thread_id, threadrun.id);
        //     console.log(`threadrun status: ${threadrun.status}`);
        // }

        // const message = await createMessage(thread_id, "user", `TITLE: ${title} DESCRIPTION:${description} BULLETPOINTS:${bulletpoints}`);

        // let run = await createRun(thread_id, assId);
        // console.log(`run created: ${run.id}`);

        // while (run.status === "running" || run.status === "queued" || run.status === "in_progress") {
        //     console.log("waiting for completion");
        //     await new Promise((resolve) => setTimeout(resolve, 1000));
        //     run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
        //     console.log(`run status: ${run.status}`);
        // }
        // console.log(`run completed: ${run.id}`);

        // const message_response = await openai.beta.threads.messages.list(thread_id);
        // const messages = message_response.data;

        // let latest_message = messages[0]?.content[0]?.text?.value;

        // // Clean the JSON string properly
        // latest_message = latest_message
        //     ?.replace(/```json/g, "")
        //     ?.replace(/```/g, "")
        //     ?.replace(/\\n/g, "")
        //     ?.trim();

        // console.log("msg", latest_message);



        // History.create({
        //     userID:req.user.id,
        //     title,
        //     description,
        //     bullets:bulletpoints,
        //     error:JSON.parse(latest_message)

        // })



        // // Parse the cleaned string
        // return res.status(200).json({ message: "text verified", message: JSON.parse(latest_message), success: true });
        return res.status(200).json({ message: "text verified", success: true });

        /*
        const stripe = Stripe('your_publishable_key');

        async function handlePaymentIntent(paymentIntentClientSecret) {
          const { error, paymentIntent } = await stripe.confirmCardPayment(paymentIntentClientSecret);

          if (error) {
            console.error('Payment failed:', error);
          } else if (paymentIntent.status === 'succeeded') {
            console.log('Payment succeeded:', paymentIntent);
          }
        }

        // Call this function if the payment requires action
        handlePaymentIntent('client_secret_from_server');
        */
        
    } catch (error) {
        if(error.code=='authentication_required'){
            return res.status(200).json({ message: "not enough credits, autopay failed, authentication required", success: false });
        }else{
            console.log(error);
            return res.status(400).json({ message: "something went wrong, please try again or contact support", success: false });
        }
    }
};

export const generateThread=async (req,res)=>{
    try{

        const emptyThread = await openai.beta.threads.createAndRun({
            assistant_id:assId,
        })

        return res.json({thread:emptyThread})
    }catch(err){
        console.log(err)
        return res.json(err)
    }
}



async function createRun(thread_id, assistantId) {



    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: assistantId,
    });
  
    return run;
}
  
async function createMessage(thread_id, role, content) {
    const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY})

  const threadMessages = await openai.beta.threads.messages.create(thread_id, {
    role,
    content,
  });
  return threadMessages;
}


export const getUserHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const Histories = await History.find({ userID: req.user.id }).skip(skip).limit(limit);

        const totalHistories = await History.countDocuments({ userID: req.user.id });

        res.status(200).json({
            success: true,
            page,
            limit,
            totalHistories,
            totalPages: Math.ceil(totalHistories / limit),
            Histories
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}


export const getUser = async (req,res) =>{
    try {
        const user = await User.findOne({email:req.query.email})
        res.status(200).json({user})
    } catch (error) {
        console.log(error)
    }
}
  
export const buyCredits = async (req, res) => {
    try{
    const { variant,email } = req.body;

    if (!variant||!email){
        return res.status(400).json({message:"data incomplete"})
    }

    const user = await User.findOne({email:req.user.email})

    if(!user.customerId){
        const customer = await stripe.customers.create({
            email: req.user.email,
            name: req.user.userName,
        });

        user.customerId=customer.id
        req.user.customerId=customer.id
        user.save()
        console.log(user)
    }

    const offer = await Offer.findOne({variant})

    const paymentIntent = await stripe.paymentIntents.create({
        amount: offer.amount,
        currency: "usd",
        automatic_payment_methods: {
        enabled: true,
        },
        customer:req.user.customerId,
        metadata:{
            variant,
            credits:offer.credits
        },
        payment_method_options:{
            card:{
                setup_future_usage:'off_session'
            }
        }
    });

    res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        success:true
    });

    }catch(error){
        console.log(error)
    }
};

export const addPaymentMethod = async (req,res) =>{
    try{
        const user = await User.findOne({email:req.user.email})

        if(!user.customerId){
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.userName,
            });
    
            user.customerId=customer.id
            req.user.customerId=customer.id
            user.save()
            console.log(user)
        }

        const setupIntent = await stripe.setupIntents.create({
          customer: req.user.customerId,
          automatic_payment_methods: {enabled: true,},
          attach_to_self:true
        });
        console.log(setupIntent)
        res.status(200).json({success:true, clientSecret:setupIntent.client_secret})
    }catch(err){
        console.log(err)
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const BuyCreditWebhook = async (req, res) => {
    try {
        const details = req.body.data.object;
        if (!details || details.object=="charge") {
            return res.status(400).json({ message: "Invalid webhook data" });
        }


        let webhookCall = await ProcessedEvent.findOne({ id: details.id });

        if (webhookCall) {
            return res.status(200).json({ message: "webhook already called" });
        }

        webhookCall = await ProcessedEvent.create({ id: details.id });

        const user = await User.findOne({ customerId: details.customer });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const variant = Number(details.metadata.variant)

        user.credits = Number(user.credits) + Number(details.metadata.credits);
        await user.save();

        return res.status(200).json({ success: true, credits: user.credits });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getPurchaseHistory = async (req,res) => {
    try{
        const {customerId} = req.user
        if(!customerId){
            return res.status(400).json({message:"no customer Id given"})
        }
        const charges = await stripe.charges.list({customer:customerId})

        
        const payments = charges.data.map(e=>{
            return {id:e.id,currency:e.currency,amount:e.amount,currency:e.currency,credits:e.metadata.credits,date:e.created}
        })

        console.log("bruh",payments)

        return res.status(200).json({success:true,payments})
    }catch(error){
        console.log(error)
    }
}

export const numberOfAnalysed = async (req,res) => {
    try{
        const count = await History.countDocuments({userID:req.user.id})
        res.status(200).json({success:true,count})
    }catch(error){
        console.log(error)
    }
}

export const getCardInfo = async (req,res) => {
    try{
        const user = await User.findOne({email:req.user.email})

        console.log(user)

        if (!req.user.customerId){
            return res.status(200).json({message:"no customer detected"})
        }
        const paymentMethods = await stripe.customers.listPaymentMethods(req.user.customerId)

        // console.log(req.user,paymentMethods)
        const cards=paymentMethods.data.map(e=>{
            return {expMonth:e.card.exp_month,expYear:e.card.exp_year,last4:e.card.last4}
        })
        res.status(200).json({cards})
    }catch(error){
        console.log(error)
    }
}

export const toggleAutoCredit = async (req,res) =>{
    try{
        const {preferredCredits} = req.query
        console.log(preferredCredits)
        if(preferredCredits < 0){
            return res.status(400).json({success:false, message:"preferred Credits can not be less than 0"})
        }
        const user = await User.findOne({email:req.user.email})
        const uac = user.autocharge
        user.autocharge=!user.autocharge
        user.preferredCredits=preferredCredits
        user.save()
        return res.status(200).json({success:true, message:`auto credits: ${uac?"off":"on"}`})
    }catch(err){
        console.log(err)
    }
}

export const getGraphData = async (req,res) =>{
    try{
        const userId=req.user.id
        const histories = await History.find({ userID: userId, createdAt: { $gte: new Date(Date.now() - 15768000000) } });
    
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyCredits = {};
        
        histories.forEach(history => {
          const month = monthNames[history.createdAt.getMonth()];
          if (!monthlyCredits[month]) {
            monthlyCredits[month] = 0;
          }
          monthlyCredits[month] += history.credits;
        });
        
        const result = Object.keys(monthlyCredits).map(month => ({
          name: month,
          credits: monthlyCredits[month]
        }));


        res.status(200).json(result)

        


    }catch(err){
        console.log(err)
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