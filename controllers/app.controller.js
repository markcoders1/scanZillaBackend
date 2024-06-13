import Joi from "joi"
import OpenAI from "openai";

const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY})

const verifyTextJoi = Joi.object({
    title: Joi.string().regex(/^[a-zA-Z0-9,.: ]*$/).min(0).max(200).messages({
        "string.pattern.base":"must be standard ASCII characters only"
    }),
  
    description: Joi.string().regex(/^[ -~]*$/).min(0).max(1000).messages({

    }),

    bulletpoints: Joi.string().min(0).messages({

    })
});

export const verifyText =async (req,res)=>{
    try {
        const {title,description,bulletpoints}=req.body
        const {error} = verifyTextJoi.validate(req.body,{abortEarly:true});
        
        if (error) {
          console.log(error);
          return res.status(200).json({ message: error.details });
        }
        
        return res.status(200).json({message: "text verified"});

    } catch (error) {
        console.log(error)
    }
}

export const generateAssistant=async (req,res)=>{
    try{
        const myAssistant = await openai.beta.assistants.create({
            instructions:
            `you will receive a product description to be used on the amazon website for specific products, you have to make sure that this description adheres to the given rules I'm about to give you, you will be returning a fixed version of that description and pointing out the errors in bullet points, the given description will be in the format:

            "DESCRIPTION:
            ~enter long description here~"

            here are the Dos and Don'ts of the description:

            DO'S:
            Use numerals: "2" instead of "two".
            Use dash ( - ) instead of colon ( : ) after each bullet point "title".
            Spell out measurements, such as quart, inch, or feet
            Adhere to character limits in bullet points (max. 250 each, 1000 for overall) and descriptions (2000 including tags) to avoid ranking issues.
            Include necessary trademarks tactfully to maintain organic traffic.
            For organic traffic and product compatibility - use known models, not brands. (e.g., Use "iPhone 13" instead of "Apple".)
            If you need to use a brand name, add "compatible" after the brand name. (e.g., "Compatible with Nespresso...")
            HTML Tags Usage:  Only "</br>" is permitted. Unless in Books category.
            Use correct grammar, punctuation, and complete sentences.

            DON'TS:
            Don't use inches (“”) sign (double prime symbol). Spell it out instead.
            Don't use non-English letters.
            Don't use ALL CAPS.
            Don't use non-language ASCII characters such as Æ, ©, or ®.
            Don't use promotional phrases, such as "free shipping", "100% quality guaranteed", "highest", "great", etc.
            Don't use subjective commentary, such as "Hot Item" or "Best seller".
            Don't use direct customer communications such as “please contact us”.
            Don't use subjective commentary.
            Don't use bad English/incorrect grammar.
            Don't write contradicting information. (e.g., Toy is for kids age 3+ but keyword phrase says 1-3.
            Don't use any terminology/claim that implies medical benefits or treatments, including those related to sleep.
            If the product is not animal/nature related - all of these words are forbidden.
            No pesticides related content should ever be included, unless instructed otherwise. (e.g., ants, bugs, insects, disease, mold, infection, bee, pest, etc.)
            Avoid terms like "great gift choice" and use "thoughtful gift" only if it is thoughtful related product.
            Do not include promotional and pricing information.
            `,
            name: "SCZLA",
            model: "gpt-4-turbo",
        });
        
        console.log(myAssistant);
        return res.json({assistant:myAssistant})
    }catch(err){
        console.log(err)
        return res.json(err)
    }
}
