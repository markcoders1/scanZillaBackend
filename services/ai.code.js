import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
dotenv.config()

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const createModelSchema = z.object({
    words:z.array(z.string()),
    isBrand:z.boolean()
});
const ModelName = `wordAssistant`;
const instructionsFilePath = "json/Word-replacer.rules.json";

export const generateAssistant = async (req,res) => {
    const file = await fs.readFile(instructionsFilePath,{encoding:"utf8"})
    const object = JSON.parse(file)
    
    const assistant = await openai.beta.assistants.create({
        instructions:object.fixed,
        temperature:0.1,
        model: "gpt-4o-2024-08-06",
        response_format: zodResponseFormat(createModelSchema, ModelName)
    })
    res.status(200).json(assistant)
    console.log(assistant)
    // return assistant
}

export const updateAssistant = async (req,res) => {
    try{
        const assId = "asst_PVwcSfMVtEqUPJXw64yJtELa"
        const {fixed} = req.body
        const instructions = JSON.parse(await fs.readFile(instructionsFilePath, "utf8"));

        instructions.fixed = fixed  || instructions.fixed
        
        await fs.writeFile(instructionsFilePath, JSON.stringify(instructions, null, 2), "utf8");

        const updatefunc = async () => {
            return await openai.beta.assistants.update(assId, {
                instructions: instructions.fixed,
                response_format: zodResponseFormat(createModelSchema, ModelName),
                model: "gpt-4o-2024-08-06",
                temperature: 0.1,
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