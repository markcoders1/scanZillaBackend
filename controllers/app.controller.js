import Joi from "joi"
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from 'fs'
import { History } from "../models/history.model.js";
import Stripe from "stripe";
import { User } from "../models/user.model.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const openai = new OpenAI(process.env.OPENAI_API_KEY)


// const assId = "asst_3nOxuR6z7N3xY1ZC1WKYAIhe"
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

    // Check each blacklisted word or phrase
    for (const phrase of blacklistedWords) {
        if (lowerCaseParagraph.includes(phrase.toLowerCase())) {
            usedWords.push(phrase);
            containsWords = true;
        }
    }

    // Remove duplicates
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



const verifyTextJoi = Joi.object({
    title: Joi.string().custom((value,helper)=>{
        const {containsWords,usedWords}=containsBlacklistedWord(value)
        if (containsWords){
            return helper.message(`this text contains the words: (${usedWords.map(word=>" "+word)} ) which are blacklisted`)
        }
        return value
    }).regex(/^[a-zA-Z0-9,– '.:\-\\/&]*$/).min(0).max(200).messages({
        "string.pattern.base":"must be standard ASCII characters or generic symbols"
    }),
  
    description: Joi.string().custom((value,helper)=>{
        const {containsWords,usedWords}=containsBlacklistedWord(value)
        if (containsWords){
            return helper.message(`this text contains the words: (${usedWords.map(word=>" "+word)} ) which are blacklisted`)
        }
        return value
    }).regex(/^[ -~]*$/).min(0).max(1000).messages({
        "string.pattern.base":"must be standard ASCII characters only"
    }),

    bulletpoints: Joi.string().custom((value,helper)=>{
        const {containsWords,usedWords}=containsBlacklistedWord(value)
        if (containsWords){
            return helper.message(`this text contains the words: (${usedWords.map(word=>" "+word)} ) which are blacklisted`)
        }
        return value
    }).regex(/^[A-Za-z0-9 ,.'\-]*$/).min(0).messages({
        "string.pattern.base":"must be standard ASCII characters only or generic symbols"
    })
});

export const verifyText = async (req, res) => {
    try {
        let { title, description, bulletpoints } = req.body;
        req.body.title = title.replace(/[\x00-\x1F]/g, "");
        req.body.description = description.replace(/[\x00-\x1F]/g, "");
        req.body.bulletpoints = bulletpoints.replace(/[\x00-\x1F]/g, "");

        const { error } = verifyTextJoi.validate(req.body, { abortEarly: false });

        console.log(error)


        if (error) {
            let err = error.details.map((field) => {
                if (field.type=="string.pattern.base"){
                    const potato = findInvalidCharacters(field?.context?.value, field?.context?.regex)
                    if (field.context.label == "title") {
                        return { error: `${field.message}: ${potato}`, field: "TE" };
                    } else if (field.context.label == "description") {
                        return { error: `${field.message}: ${potato}`, field: "DE" };
                    } else if (field.context.label == "bulletpoints") {
                        return { error: `${field.message}: ${potato}`, field: "BE" };
                    }
                }else if(field.type=="custom"){
                    if (field.context.label == "title") {
                        return { error: field.message, field: "TE" };
                    } else if (field.context.label == "description") {
                        return { error: field.message, field: "DE" };
                    } else if (field.context.label == "bulletpoints") {
                        return { error: field.message, field: "BE" };
                    }
                }
            });
            
            const errObj = err.reduce((acc, current) => {
                acc[current.field] = current.error;
                return acc;
            }, {});

            console.log("err", errObj);
            return res.status(200).json({ message: errObj, success: false });
        }

        History.create({
            userID:req.user.id,
            title,
            description,
            bullets:bulletpoints

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

        // // Parse the cleaned string
        // return res.status(200).json({ message: "text verified", message: JSON.parse(latest_message), success: true });
        return res.status(200).json({ message: "text verified", success: true });
        
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "something went wrong, please try again or contact support", success: false });
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


export const getUserHistory = async (req,res)=>{
    try {
        const Histories = await History.find({userID:req.user.id})

        res.status(200).json({success:true,Histories})
    } catch (error) {
       console.log(error) 
    }
}

const calculateOrderAmount = (variant) => {
    switch (variant) {
        case 1:
            return 1000
            break;
        case 2:
            return 3000
            break;
        case 3:
            return 6000
            break;
    
        default:
            break;
    }
};
  
export const buyCredits = async (req, res) => {
    try{
    const { variant,email } = req.body;

    if (!variant||!email){
        return res.status(400).json({message:"data incomplete"})
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(variant),
        currency: "usd",
        automatic_payment_methods: {
        enabled: true,
        },
    });

    res.status(200).json({
        clientSecret: paymentIntent.client_secret,
    });

    }catch(error){
        console.log(error)
    }
};

export const BuyCreditWebhook = async (req,res)=>{
    try {
        console.log('hi')
    } catch (error) {
        console.log(error)
    }
}