import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config()

const openai = new OpenAI(process.env.OPENAI_API_KEY);

//a way to update the ai
//a way to use the ai inside a promise.all

async function createRun(thread_id, assistantId) {
    const run = await openai.beta.threads.runs.create(thread_id, {
        assistant_id: assistantId,
    });

    return run;
}

async function createMessage(thread_id, role, content) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const threadMessages = await openai.beta.threads.messages.create(
        thread_id,
        {
            role,
            content,
        }
    );
    return threadMessages;
}

//assId = asst_J8gYM42wapsrXpntcCLMe8wJ

export const analyzeValue = async (value,assistant) => {
    try{

        let latest_message;
        let assId
        if(assistant == 'title'){
            assId = 'asst_3nOxuR6z7N3xY1ZC1WKYAIhe'
        }else if(assistant == 'desc'){
            assId = 'asst_GokOIlMbjA1jlvKb8pLNMR51'
        }else if(assistant == 'bullets'){
            assId = 'asst_vZhSQFlyB4lcTEaJhk0FitZa'
        }
        const { thread_id, id } = await openai.beta.threads.createAndRun({assistant_id: assId,temperature:0.1});
        console.log(assistant, thread_id);
        let threadrun = await openai.beta.threads.runs.retrieve(thread_id, id);
        
        while (threadrun.status === "running" ||threadrun.status === "queued" ||threadrun.status === "in_progress") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            threadrun = await openai.beta.threads.runs.retrieve(thread_id,threadrun.id);
        }
        
        const message = await createMessage(thread_id,"user",`${value}`);
        
        let run = await createRun(thread_id, assId);
        console.log(`run created: ${run.id} at ${thread_id} for ${assistant}`);
        
        while (run.status === "running" ||run.status === "queued" ||run.status === "in_progress") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
        }

        let message_response = await openai.beta.threads.messages.list(thread_id);
        const messages = message_response.data;
        latest_message = messages[0]?.content[0]?.text?.value;
        console.log(assistant,"latest_message",latest_message)
    
        return JSON.parse(latest_message);
    }catch(err){
        console.log(assistant,err);
        return {}
    }
}