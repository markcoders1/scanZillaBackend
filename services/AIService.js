import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config()

let assId = ''

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
        if(assistant == 'title'){
            assId = 'asst_3nOxuR6z7N3xY1ZC1WKYAIhe'
        }else if(assistant == 'desc'){
            assId = 'asst_GokOIlMbjA1jlvKb8pLNMR51'
        }else if(assistant == 'bullets'){
            assId = 'asst_vZhSQFlyB4lcTEaJhk0FitZa'
        }
        const { thread_id, id } = await openai.beta.threads.createAndRun({assistant_id: assId});
        console.log(assistant, thread_id);
        let threadrun = await openai.beta.threads.runs.retrieve(thread_id, id);
        
        while (threadrun.status === "running" ||threadrun.status === "queued" ||threadrun.status === "in_progress") {
            // console.log("waiting for completion");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            threadrun = await openai.beta.threads.runs.retrieve(
                thread_id,
                threadrun.id
            );
            // console.log(`threadrun status: ${threadrun.status}`);
        }
        
        const message = await createMessage(thread_id,"user",`${value}`);
        
        let run = await createRun(thread_id, assId);
        console.log(`run created: ${run.id} at ${thread_id} for ${assistant}`);
        
        while (run.status === "running" ||run.status === "queued" ||run.status === "in_progress") {
            // console.log("waiting for completion");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
            console.log(`run status: ${run.status} for ${assistant} at ${thread_id}`);
        }
    
        console.log(`analyzed ${assistant} at ${thread_id} using run ${run.id}`);
        const message_response = await openai.beta.threads.messages.list(thread_id);
        console.log(`analyzed ${assistant} at ${thread_id} using run ${run.id}`);
        const messages = message_response.data;
        latest_message = messages[0]?.content[0]?.text?.value;
        console.log(assistant,"latest_message",latest_message)
    
        return new Promise((resolve) => resolve(JSON.parse(latest_message)));
    }catch(err){
        console.log(assistant,err);
        return {}
    }
}