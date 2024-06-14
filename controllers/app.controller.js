import Joi from "joi"
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
});

const openai = new OpenAI(process.env.OPENAI_API_KEY)


const assId = "asst_GokOIlMbjA1jlvKb8pLNMR51"
const threadId ="thread_Wy3wHqIBrHnQ0MxKyNU96wEL"
const runId = "run_NtD8Nk9cxGzelSCPf12JXy8l"

const verifyTextJoi = Joi.object({
    title: Joi.string().regex(/^[a-zA-Z0-9,– '.:\-\\/&]*$/).min(0).max(200).messages({
        "string.pattern.base":"must be standard ASCII characters only T"
    }),
  
    description: Joi.string().regex(/^[ -~]*$/).min(0).max(1000).messages({
        "string.pattern.base":"must be standard ASCII characters only D"
    }),

    bulletpoints: Joi.string().regex(/^[A-Za-z0-9 ,.'\-]*$/).min(0).messages({
        "string.pattern.base":"must be standard ASCII characters only B"
    })
});



export const verifyText =async (req,res)=>{
    try {
        const {title,description,bulletpoints}=req.body
        const {error} = verifyTextJoi.validate(req.body,{abortEarly:false});
        
        if (error) {
          console.log(error);
          return res.status(200).json({ message: error.details });
        }


        const message = await createMessage(threadId,"user",`TITLE: ${title} DESCRIPTION:${description} BULLETPOINTS:${bulletpoints}`);


        let run = await createRun(threadId, assId);
        console.log(run);
        console.log(`run created: ${run.id}`);
    

        while (
          run.status === "running" ||
          run.status === "queued" ||
          run.status === "in_progress"
        ) {
          console.log("waiting for completion");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          run = await openai.beta.threads.runs.retrieve(threadId, run.id);
          console.log(`run status: ${run.status}`);
        }
        console.log(`run completed: ${run.id}`);
    


        const message_response = await openai.beta.threads.messages.list(threadId);
        console.log(message_response);
        const messages = message_response.data;
    
        let latest_message = messages[0].content[0].text.value;

        console.log(latest_message)

        latest_message = latest_message.replace("```json","").replace("```","").replace("\\n","").replace("\\","")

        
        return res.status(200).json({message: "text verified",latest_message:JSON.parse(latest_message)});

    } catch (error) {
        console.log(error)
    }
}

export const generateAssistant=async (req,res)=>{
    try{
        const myAssistant = await openai.beta.assistants.create({
            instructions:
            `you will receive a product description,title and product bullet points, you could get all three,two of the three, just or just one of them, if you receive none, please reply with "You did not enter any values" to be used on the amazon website for specific products, you have to make sure that these value adheres to the given rules I'm about to give you, you will be returning a fixed version of that specific field and pointing out the errors in bullet points and then returning a corrected version of them, the given description will be in the format:          "TITLE: [enter title here] DESCRIPTION: [enter long description here] BULLETPOINTS: [enter bullet points here]", you are to return the result in a JSON format as follows: {TE:[title error],TF:[title fixed],DE:[description error],DF:[description fixed],BE:[bullet point error],BF:[bullet point fixed]}         here are the Dos and don'ts of the title:           DO'S: -Format: [Brand name] + [Main Keyword Phrase/Highest SV] - [Top-Searched Phrase], [2nd Top-Searched Phrase], [Product Info], [Variation} -Maximum text characters: 200 (in general) -For phrases with dash, remove the dash and add space. (e.g. Instead of age 2-4 then age 2 3 4, or if it's a long range then 2 8.) -Capitalize the first letter of each word except for prepositions (in, on, over, with), conjunctions (and, or, for), or articles (the, a, an). -Use numerals: "2" instead of "two". -Include necessary punctuation, like hyphens (-), forward slashes (/), commas (,), ampersands (&), and periods (.). -Abbreviate measurements, such as "cm", "oz", "in", and "kg". -Include necessary trademarks tactfully to maintain organic traffic. -For organic traffic and product compatibility - use known models, not brands. (e.g., Use "iPhone 13" instead of "Apple".) -If you need to use a brand name, add "compatible" after the brand name. (e.g., "Compatible with Nespresso...")          DON'TS: -Don't use inches (“”) sign (double prime symbol). Spell it out instead. -Don't use characters for decoration, such as ~ ! * $ ? _ ~ { } # < > | * ; ^ ¬ ¦ -Don't use non-English letters. -Don't use ALL CAPS. -Don't use non-language ASCII characters such as Æ, ©, or ®. -Don't use promotional phrases, such as "free shipping", "100% quality guaranteed", "highest", "great", etc. -Don't use subjective commentary, such as "Hot Item" or "Best seller". -Don't use direct customer communications such as “please contact us”. -Don't use subjective commentary. -Don't use bad English/incorrect grammar. -Don't write contradicting information. (e.g., Toy is for kids age 3+ but keyword phrase says 1-3. -Don't use any terminology/claim that implies medical benefits or treatments, including those related to sleep. -If the product is not animal/nature related - all of these words are forbidden. -No pesticides related content should ever be included, unless instructed otherwise. (e.g., ants, bugs, insects, disease, mold, infection, bee, pest, etc.)         here are the Dos and Don'ts of the description:         DO'S: -Use numerals: "2" instead of "two". -Use dash ( - ) instead of colon ( : ) after each bullet point "title". -Spell out measurements, such as quart, inch, or feet -Include necessary trademarks tactfully to maintain organic traffic. -For organic traffic and product compatibility - use known models, not brands. (e.g., Use "iPhone 13" instead of "Apple".) -If you need to use a brand name, add "compatible" after the brand name. (e.g., "Compatible with Nespresso...") -HTML Tags Usage:  Only "</br>" is permitted. Unless in Books category. -Use correct grammar, punctuation, and complete sentences.         DON'TS: -Don't use inches (“”) sign (double prime symbol). Spell it out instead. -Don't use non-English letters. -Don't use ALL CAPS. -Don't use non-language ASCII characters such as Æ, ©, or ®. -Don't use promotional phrases, such as "free shipping", "100% quality guaranteed", "highest", "great", etc. -Don't use subjective commentary, such as "Hot Item" or "Best seller". -Don't use direct customer communications such as “please contact us”. -Don't use subjective commentary. -Don't use bad English/incorrect grammar. -Don't write contradicting information. (e.g., Toy is for kids age 3+ but keyword phrase says 1-3. -Don't use any terminology/claim that implies medical benefits or treatments, including those related to sleep. -If the product is not animal/nature related - all of these words are forbidden. -No pesticides related content should ever be included, unless instructed otherwise. (e.g., ants, bugs, insects, disease, mold, infection, bee, pest, etc.) -Avoid terms like "great gift choice" and use "thoughtful gift" only if it is thoughtful related product. -Do not include promotional and pricing information.            here are the do's and don'ts of the bullet points:          DO'S: -Use numerals: "2" instead of "two". -Use dash ( - ) instead of colon ( : ) after each bullet point "title". -Spell out measurements, such as quart, inch, or feet -Adhere to character limits in bullet points (max. 250 each) -Include necessary trademarks tactfully to maintain organic traffic. -For organic traffic and product compatibility - use known models, not brands. (e.g., Use "iPhone 13" instead of "Apple".) -If you need to use a brand name, add "compatible" after the brand name. (e.g., "Compatible with Nespresso...")           DON'TS: -Don't use inches (“”) sign (double prime symbol). Spell it out instead. -Don't use non-English letters. -Don't use ALL CAPS. -Don't use non-language ASCII characters such as Æ, ©, or ®. -Don't use promotional phrases, such as "free shipping" or "100% quality guaranteed". -Don't use subjective commentary, such as "Hot Item" or "Best seller". -Don't use direct customer communications such as “please contact us”. -Don't use bad English/incorrect grammar. -Don't write contradicting information. (e.g., Toy is for kids age 3+ but keyword phrase says 1-3. -Don't use any terminology/claim that implies medical benefits or treatments, including those related to sleep. -If the product is not animal/nature related - all of these words are forbidden. -No pesticides related content should ever be included, unless instructed otherwise. (e.g., ants, bugs, insects, disease, mold, infection, bee, pest, etc.) -Avoid terms like "great gift choice" and use "thoughtful gift" only if it is thoughtful related product. -Do not include promotional and pricing information.`,
            name: "SCZLA1.8",
            model: "gpt-4o",
        });
        
        console.log(myAssistant);
        return res.json({assistant:myAssistant})
    }catch(err){
        console.log(err)
        return res.json(err)
    }
}

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

// export const generateMessage=async (req,res)=>{
//     try{
//         const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY})

//         const threadMessages = await openai.beta.threads.messages.create(
//             "thread_rtluHsiMOxBjAyD5pcQgXo4R",
//             { role: "user", content: "DESCRIPTION: Buy now to make your dreams come true and become the ultimate Pokémon Trainer! This Pokémon 24 Day Advent Calendar is the perfect countdown to your favorite holiday, or any special occasion! Every door you open reveals a unique and exclusive Funko Pocket Pop! These adorable figures feature your most beloved Pokémon! You won't believe which rare ones you'll find next for your collection! Each Pocket Pop! figure is carefully crafted and varies in height depending on the character, with the maximum figure height reaching up to 2-inches tall. This is a must-have for any true Pokémon fan and makes an unbeatable gift! Limited stock available, so don't miss out! Order now before it's too late!" }
//         );

        

//         return res.json({thread:threadMessages})
//     }catch(err){
//         console.log(err)
//         return res.json(err)
//     }
// }

export const getMessages=async (req,res)=>{
    try {

        console.log("getting messages")

        const threadMessages = await openai.beta.threads.messages.list(threadId);

        return res.json({thread:threadMessages})
    }catch(err){
        console.log(err)
        return res.json(err)
    }
}

// export const createRun=async (req,res)=>{
//     try {
//         const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY})

//         const run =awaitopenai.beta.threads.runs.create("thread_rtluHsiMOxBjAyD5pcQgXo4R", {
//             assistant_id: "asst_aYkNWt5TJR1zFjeaW2pO37uF",
//           });

//         return res.json({run})
//     } catch (error) {
//         console.log(error)
//         return res.json({error})
//     }
// }

export const generateMessage = async (req,res)=>{
    try {
        const { prompt } = req.body;
        const message = await createMessage(
          threadId,
          "user",
          `${prompt}`
        );

        console.log(message)


        let run = await createRun(threadId, assId);
        console.log(run);
        console.log(`run created: ${run.id}`);
    

        while (
          run.status === "running" ||
          run.status === "queued" ||
          run.status === "in_progress"
        ) {
          console.log("waiting for completion");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          run = await openai.beta.threads.runs.retrieve(threadId, run.id);
          console.log(`run status: ${run.status}`);
        }
        console.log(`run completed: ${run.id}`);
    


        const message_response = await openai.beta.threads.messages.list(threadId);
        console.log(message_response);
        const messages = message_response.data;
    
        const latest_message = messages[0];
        
        res.json({latest_message:latest_message.content[0].text.value})
    }catch(err){
        console.log(err)
    }
}

async function createRun(threadId, assistantId) {



    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });
  
    return run;
}
  
async function createMessage(threadId, role, content) {
    const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY})

  const threadMessages = await openai.beta.threads.messages.create(threadId, {
    role,
    content,
  });
  return threadMessages;
}

export const listAssistants =async (req,res)=>{
    try {
        const myAssistants = await openai.beta.assistants.list();
        
        res.json({myAssistants})
    }catch(err){
        console.log(err)
    }
}

export const deleteAssistant =async (req,res)=>{
    try {
        const response = await openai.beta.assistants.del("asst_y7MDIkJpuoQq5z8jPYgs7O7C");
        
        return res.json({response})
    }catch(err){
        console.log(err)
        return res.json(err)
    }
}

export const retreiveRun = async (req,res)=>{
    try {
        const response = await openai.beta.threads.runs.retrieve(
            "thread_rtluHsiMOxBjAyD5pcQgXo4R",
            "run_nBthx7T7PS7ESwkBnnM6qsIt"
          );
        
        return res.json({response})
    }catch(err){
        console.log(err)
        return res.json(err)
    }
}


