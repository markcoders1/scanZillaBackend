import Joi from "joi"
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
});

const openai = new OpenAI(process.env.OPENAI_API_KEY)


const assId = "asst_3nOxuR6z7N3xY1ZC1WKYAIhe"
const threadId ="thread_cuNmAqEYVTk0nGRh8yeGrQuu"
const runId = "run_NtD8Nk9cxGzelSCPf12JXy8l"

function findInvalidCharacters(input,regex) {
    let invalidChars = [];
  
    for (let char of input) {
      if (!regex.test(char) && !invalidChars.includes(char)) {
        invalidChars.push(char);
      }
    }
  
    // Join the unique invalid characters with commas
    return invalidChars.join(' ');
}

const verifyTextJoi = Joi.object({
    title: Joi.string().regex(/^[a-zA-Z0-9,– '.:\-\\/&]*$/).min(0).max(200).messages({
        "string.pattern.base":"must be standard ASCII characters or generic symbols"
    }),
  
    description: Joi.string().regex(/^[ -~]*$/).min(0).max(1000).messages({
        "string.pattern.base":"must be standard ASCII characters only"
    }),

    bulletpoints: Joi.string().regex(/^[A-Za-z0-9 ,.'\-]*$/).min(0).messages({
        "string.pattern.base":"must be standard ASCII characters only or generic symbols"
    })
});



export const verifyText =async (req,res)=>{
    try {
        let {title,description,bulletpoints}=req.body
        req.body.title=title.replace(/[\x00-\x1F]/g, "");
        req.body.description=description.replace(/[\x00-\x1F]/g, "");
        req.body.bulletpoints=bulletpoints.replace(/[\x00-\x1F]/g, "");
        const {error} = verifyTextJoi.validate(req.body,{abortEarly:false});
        
        if (error) {
            let err=error.details.map((field)=>{
                console.log(field)
                if(field.context.label=="title"){

                    return {error:`${field.message}: ${findInvalidCharacters(field.context.value,field.context.regex)}`,field:"TE"}
                }else if(field.context.label=="description"){
                    return {error:`${field.message}: ${findInvalidCharacters(field.context.value,field.context.regex)}`,field:"DE"}
                }else if(field.context.label=="bulletpoints"){
                    return {error:`${field.message}: ${findInvalidCharacters(field.context.value,field.context.regex)}`,field:"BE"}
                }
            })
              
            const errObj= err.reduce((acc, current) => {
                acc[current.field] = current.error;
                return acc;
            }, {});

            console.log("err",errObj)
          return res.status(200).json({ message: errObj ,success:false});
        }



        const message = await createMessage(threadId,"user",`TITLE: ${title} DESCRIPTION:${description} BULLETPOINTS:${bulletpoints}`);


        let run = await createRun(threadId, assId);
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
    
        let latest_message = messages[0]?.content[0]?.text?.value;

        console.log(latest_message)

        latest_message = latest_message?.replace("```json","")?.replace("```","")?.replace("\\n","")?.replace("\\","")

        
        return res.status(200).json({message: "text verified",message:JSON.parse(latest_message),success:true});

    } catch (error) {
        console.log(error)
        return res.status(400).json({message: "something went wrong, please try again or contact support",latest_message:JSON.parse(latest_message),success:false});
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


