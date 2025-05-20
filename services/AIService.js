import OpenAI from "openai";
import dotenv from "dotenv";
import { Word } from "../models/words.model.js";
import { loadBlacklistedWords } from "../utils/customChecks.js";
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
            content
        }
    );
    return threadMessages;
}

//assId = asst_J8gYM42wapsrXpntcCLMe8wJ

function removeDuplicates(errors) {
    const uniqueErrors = {};
    const result = [];

    errors.forEach(error => {
        if (!uniqueErrors[error.error]) {
            uniqueErrors[error.error] = { ...error };
        } else {
            if (uniqueErrors[error.error].point){
                uniqueErrors[error.error].point = -1;
            }
        }
    });

    for (const key in uniqueErrors) {
        result.push(uniqueErrors[key]);
    }

    return result;
}

export const analyzeValue = async (value,assistant) => {
    try{

        let latest_message = "{}";
        let assId

        if(assistant == 'title'){
            assId = 'asst_Pt5hHWrKSBhRpG2HujTTGAPS'
        }else if(assistant == 'description'){
            assId = 'asst_6XjxcgjvaKIEzX9jHYb0f8BX'
        }else if(assistant == 'bullets'){
            assId = 'asst_BZVT36g8vtZn9pF8tyfW04zP'
        }

        // if(assistant == 'title'){
        //     assId = 'asst_3nOxuR6z7N3xY1ZC1WKYAIhe'
        // }else if(assistant == 'description'){
        //     assId = 'asst_GokOIlMbjA1jlvKb8pLNMR51'
        // }else if(assistant == 'bullets'){
        //     assId = 'asst_vZhSQFlyB4lcTEaJhk0FitZa'
        // }

        const { thread_id, id } = await openai.beta.threads.createAndRun({assistant_id: assId,temperature:0.1});
        console.log(assistant, thread_id);
        let threadrun = await openai.beta.threads.runs.retrieve(thread_id, id);
        
        while (threadrun.status === "running" ||threadrun.status === "queued" ||threadrun.status === "in_progress") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            threadrun = await openai.beta.threads.runs.retrieve(thread_id,threadrun.id);
        }

        
        if(assistant == 'bullets'){
            let valueToSend = ""
            value.forEach((element,i) => {
                valueToSend+= `- ${element} `
            });
            const message = await createMessage(thread_id,"user",valueToSend);
        }else{
            const message = await createMessage(thread_id,"user",`${value}`);
        }
        
        let run = await createRun(thread_id, assId);
        console.log(`run created: ${run.id} at ${thread_id} for ${assistant}`);
        
        let counter = 0
        while (run.status === "running" ||run.status === "queued" ||run.status === "in_progress") {
            console.log(run.status,assistant +" "+ ++counter)
            await new Promise((resolve) => setTimeout(resolve, 1000));
            run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
        }

        let message_response = await openai.beta.threads.messages.list(thread_id);
        const messages = message_response.data;

        for (const message of messages) {
            if (message.role === "assistant") {
                latest_message = message.content[0]?.text?.value;
                break;
            }
        }

        let valToSend = {}
        try{
            valToSend = JSON.parse(latest_message)
        }catch(err){
            console.log(err)
            valToSend = {}
        }

        if(assistant !== "bullets"){
            try{
                valToSend = valToSend[Object.keys(valToSend)[0]].map(e=> {
                    if(e.error.startsWith("-")){
                        e.error = e.error.substring(1)
                    }
                    return {priority:e.priority , error:e.error}
                })
            }catch(err){
                console.log(err)
                valToSend = [{priority:"low" , error:""}]
            }
        }else{
            try{
                valToSend = valToSend[Object.keys(valToSend)[0]].map(e=> {
                    if(e.error.startsWith("-")){
                        e.error = str.substring(1)
                    }
                    return {priority:e.priority , error:e.error, point:e.point}
                })
            }catch(err){
                console.log(err)
                valToSend = [{priority:"low" , error:"", point:"-1"}]
            }
        }

        valToSend = valToSend.filter(e=>e?.error != "");
        valToSend = removeDuplicates(valToSend);

        return {valToSend,assistant};
    }catch(err){
        console.log(assistant);
        console.log(err)
        return {}
    }
}

// const newResponse = await analyzeResponse(mergedObject,{title, description, bulletpoints, keywords})w

export const analyzeResponse = async (errors,values)=>{
    try{

        const {title, description, bulletpoints, keywords} = values

        let assId = "asst_ITq8VRILS0QQi8AagLmEAgjJ"

        const { thread_id, id } = await openai.beta.threads.createAndRun({assistant_id: assId,temperature:0.1});
        console.log( thread_id );
        let threadrun = await openai.beta.threads.runs.retrieve(thread_id, id);
        
        while (threadrun.status === "running" ||threadrun.status === "queued" ||threadrun.status === "in_progress") {
            console.log(threadrun.status)
            await new Promise((resolve) => setTimeout(resolve, 1000));
            threadrun = await openai.beta.threads.runs.retrieve(thread_id,threadrun.id);
        }

        const message = await createMessage(thread_id,"user",`TITLE: ${title}, DESCRIPTION: ${description}, BULLETPOINTS: BULLET: ${bulletpoints.join(" BULLET ")}, KEYWORDS: ${keywords}, RESPONSE: ${JSON.stringify(errors)}`);
        
        let run = await createRun(thread_id, assId);
        console.log(`run created: ${run.id} at ${thread_id}`);
        
        while (run.status === "running" ||run.status === "queued" ||run.status === "in_progress") {
            console.log(run.status)
            await new Promise((resolve) => setTimeout(resolve, 1000));
            run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
        }

        let message_response = await openai.beta.threads.messages.list(thread_id);
        const messages = message_response.data;

        let latest_message = messages[0]?.content[0]?.text?.value;

        let valToSend

        try{
            valToSend = JSON.parse(latest_message) 

        }catch(err){
            console.log(err)
            valToSend = errors
        }
        
        return valToSend;

    }catch(err){
        console.log(err);
        return {}
    }
}

export const createAssistant = async () => {
    try{
        const assistant = await openai.beta.assistants.create({
            model:"gpt-4o-2024-08-06",
            name:"assistant Validator"
        })
        return assistant
    }catch(error){
        throw new Error(error)
    }
}

export const reAnalyzeValue = async (allTrue, title, description, bulletpoints, keywords ) => {

    let aiFilter = await analyzeResponse(allTrue, { title, description, bulletpoints, keywords });

        
    aiFilter = {
        TE: aiFilter?.TE.filter((e) => {
            let filter = true;
            filter = e.error.includes("ALL CAPS");
            filter = e.error.includes("all caps") || filter;
            filter = e.error.includes("Capitalized") || filter;
            filter = e.error.includes("capitalized") || filter;
            filter = e.error.includes("measurements") || filter;
            filter = e.error.includes("Measurements") || filter;
            filter = !filter;
            return filter;
        }),
        DE: aiFilter?.DE.filter((e) => {
            let filter = true;
            filter = e.error.includes("ALL CAPS");
            filter = e.error.includes("all caps") || filter;
            filter = e.error.includes("Capitalized") || filter;
            filter = e.error.includes("capitalized") || filter;
            filter = e.error.includes("measurements") || filter;
            filter = e.error.includes("Measurements") || filter;
            filter = !filter;
            return filter;
        }),
        BE: aiFilter?.BE.filter((e) => {
            let filter = true;
            filter = e.error.includes("ALL CAPS");
            filter = e.error.includes("all caps") || filter;
            filter = e.error.includes("Capitalized") || filter;
            filter = e.error.includes("capitalized") || filter;
            filter = e.error.includes("measurements") || filter;
            filter = e.error.includes("Measurements") || filter;
            filter = e.error !== "" || filter;
            filter = !filter;
            return filter;
        }),
        KE: aiFilter?.KE.filter((e) => {
            let filter = true;
            filter = e.error.includes("ALL CAPS");
            filter = e.error.includes("all caps") || filter;
            filter = e.error.includes("Capitalized") || filter;
            filter = e.error.includes("capitalized") || filter;
            filter = e.error.includes("measurements") || filter;
            filter = e.error.includes("Measurements") || filter;
            filter = !filter;
            return filter;
        }),
        abuse: aiFilter.abuse,
    };
    return aiFilter
}

const wordSuggestor = async (word) => {
    let latest_message = "{}";
    const assId = "asst_PVwcSfMVtEqUPJXw64yJtELa"
    const { thread_id, id } = await openai.beta.threads.createAndRun({assistant_id: assId,temperature:0.1});
    console.log("words", thread_id);
    let threadrun = await openai.beta.threads.runs.retrieve(thread_id, id);
    
    while (threadrun.status === "running" ||threadrun.status === "queued" ||threadrun.status === "in_progress") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        threadrun = await openai.beta.threads.runs.retrieve(thread_id,threadrun.id);
    }

    const message = await createMessage(thread_id,"user",word);
    
    let run = await createRun(thread_id, assId);
    console.log(`run created: ${run.id} at ${thread_id} for words`);
    
    let counter = 0
    while (run.status === "running" ||run.status === "queued" ||run.status === "in_progress") {
        console.log(run.status,"words" +" "+ ++counter)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
    }

    let message_response = await openai.beta.threads.messages.list(thread_id);
    const messages = message_response.data;

    for (const message of messages) {
        if (message.role === "assistant") {
            latest_message = message.content[0]?.text?.value;
            break;
        }
    }

    let valToSend = {}
    try{
        valToSend = JSON.parse(latest_message)
    }catch(err){
        console.log(err)
        valToSend = {}
    }

    // console.log(valToSend)
    return valToSend;
}

export const wordReplacer = async (string)=>{
    console.log(string)
    let blacklistedWords = await loadBlacklistedWords();
    let words = string.split("||||")[1].split("||");
    let newWords = [];
    for (let i = 0; i < words.length; i++) {
        const element = words[i];
        const doc = await Word.findOne({word:element})
        if(doc){
            newWords.push(doc);
        }else{
            const suggestedwords = await wordSuggestor(element)
            const filteredWords = suggestedwords.words.filter(word => !blacklistedWords.includes(word));
            if(filteredWords.length !=0){
                const newDoc = await Word.create({
                    word:element,
                    replacement:filteredWords,
                    isBrand:suggestedwords.isBrand
                })
                newWords.push(newDoc)
            }
        }
    }
    let newError = "The given value contains the following blacklisted words: ||||"
    
    newWords = newWords.map((e) => {
        let tempword = e.word
        if (tempword.toLowerCase()!=="perfect") {
            return e.word;
        }

        const shuffled = [...e.replacement].sort(() => 0.5 - Math.random());
        const selectedReplacements = shuffled.slice(0, 4);
    
        return `${e.word} - Consider replacing with ${selectedReplacements.join(', ')}`;
    });
    newError = newError + newWords.join("||")
    return newError
}