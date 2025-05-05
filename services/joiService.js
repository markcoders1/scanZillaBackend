import fs from "fs/promises"
import Joi from "joi";
import { loadBlacklistedWords,loadAllowedAbbreviations, containsAllCapsWords, containsBlacklistedWord, containsDemographic, findRepeatedWords, containsHoliday } from "../utils/customChecks.js";
import { joinStrings } from "../utils/functions.js";
import { Word } from "../models/words.model.js";
const obj = JSON.parse(await fs.readFile("json/rules.json", "utf8"));

export const joiCreator = async (initCategory,category) => {

    let blacklistedWords = await loadBlacklistedWords();
    
    let allowedAbbreviations = await loadAllowedAbbreviations();
    
    const verifyTextJoi = Joi.object({
        title: Joi.string()
            .custom((value, helper) => {
                const { containsWords, usedWords } = containsBlacklistedWord(value, blacklistedWords);
                if (containsWords) {
                    return helper.message(`The given value contains the following blacklisted words: ||||${usedWords.join("||")}`);
                }
                return value;
            })
            .custom((value, helper) => {
                const { containsWords, usedWords } = containsDemographic(value);

                let join = "is"
                if (usedWords.length>=2) join = "are"

                const demographics = joinStrings(usedWords)

                if (containsWords) {
                    return helper.message(`Ensure ${demographics} ${join} properly supported with the necessary documents and approvals for your product.`);
                }
                return value;
            })
            .custom((value, helper) => {
                const { containsWords, usedWords } = containsHoliday(value);

                let join = "is"
                if (usedWords.length>=2) join = "are"

                const Holidays = joinStrings(usedWords)

                if (containsWords) {
                    return helper.message(`Holiday Related Words like: ${Holidays} ${join} Considered Promotional and ${join} forbidden.`);
                }
                return value;
            })
            .regex(/^[ -~‚„…ˆŠŽ‘’“”•\–\—˜šžŸºÀ-ÿ]*$/)
            .min(0)
            .max(obj[category] + 1)
            .custom((value, helper) => {
                if (value.length > 0 && /^\s*$/.test(value)) {
                    return helper.message(`This text only consists of whitespace, please Enter a Value`);
                }
                return value;
            })
            .custom((value, helper) => {
                const words = findRepeatedWords(value);
                if (words.length > 0) {
                    return helper.message(`The below text contains the following repeated words (more than twice): |||| ${words.join("||")}`);
                }
                return value;
            })
            .messages({
                "string.pattern.base": "These Characters Are Not Allowed",
                "string.max": `Title for category: "${initCategory}" must be up to ${obj[category]} characters long`,
            }),

        description: Joi.string()
            .custom((value, helper) => {
                const { containsWords, usedWords } = containsBlacklistedWord(value, blacklistedWords);
                if (containsWords) {
                    return helper.message(`The given value contains the following blacklisted words: ||||${usedWords.join("||")}`);
                }
                return value;
            })
            .custom((value, helper) => {
                const { containsWords, usedWords } = containsDemographic(value);

                let join = "is"
                if (usedWords.length>=2) join = "are"

                const demographics = joinStrings(usedWords)

                if (containsWords) {
                    return helper.message(`Ensure ${demographics} ${join} properly supported with the necessary documents and approvals for your product.`);
                }
                return value;
            })
            .regex(/^[ -~‚„…ˆŠŽ‘’“”•\–\—˜šžŸºÀ-ÿ]*$/)
            .min(0)
            .max(obj.descriptionCharacters)
            .messages({
                "string.pattern.base": "These Characters Are Not Allowed",
                "string.max": `Description length must be less than or equal to ${obj.descriptionCharacters} characters long to be fully indexed`,
            })
            .custom((value, helper) => {
                const { containsCaps, cappedWords } = containsAllCapsWords(value, allowedAbbreviations);
                if (containsCaps) {
                    return helper.message(`The given value contains words in ALL CAPS. Please correct them unless they are brand names or common spellings: ||||${cappedWords.join("||")}`);
                }
                return value;
            })
            .custom((value, helper) => {
                if (value.length > 0 && /^\s*$/.test(value)) {
                    return helper.message(`This text only consists of whitespace, please Enter a Value.`);
                }
                return value;
            })
            .custom((value, helper) => {
                if (category !== "Books" && /<(?!\/br>)[^>]+>/.test(value)) {
                    return helper.message("Only </br> tags are allowed");
                }
                return value;
            }),

        bulletpoints: Joi.array()
            .items(
                Joi.string()
                    .allow("")
                    .custom((value, helper) => {
                        const { containsWords, usedWords } = containsBlacklistedWord(value, blacklistedWords);
                        if (containsWords) {
                            return helper.message(`The given value contains the following blacklisted words: ||||${usedWords.join("||")}`);
                        }
                        return value;
                    })
                    .custom((value, helper) => {
                        if (value.length > 0 && /^\s*$/.test(value)) {
                            return helper.message(`This text only consists of whitespace, please Enter a Value.`);
                        }
                        return value;
                    })
                    .custom((value, helper) => {
                        const { containsWords, usedWords } = containsDemographic(value);
    
                        let join = "is"
                        if (usedWords.length>=2) join = "are"
    
                        const demographics = joinStrings(usedWords)
    
                        if (containsWords) {
                            return helper.message(`Ensure ${demographics} ${join} properly supported with the necessary documents and approvals for your product.`);
                        }
                        return value;
                    })
                    .regex(/^[ -~‚„…ˆŠŽ‘’“”•\–\—˜šžŸºÀ-ÿ]*$/)
                    .min(0)
                    .max(obj.bulletCharacters)
                    .messages({
                        "string.pattern.base": "These Characters Are Not Allowed",
                        "string.max": `Bullet length must be less than or equal to ${obj.bulletCharacters} characters long to be fully indexed`,
                    })
                    .custom((value, helper) => {
                        const { containsCaps, cappedWords } = containsAllCapsWords(value, allowedAbbreviations);
                        if (containsCaps) {
                            return helper.message(`The given value contains words in ALL CAPS. Please correct them unless they are brand names or common spellings: ||||${cappedWords.join("||")}`);
                        }
                        return value;
                    })
            )
            .custom((value, helper) => {
                if (value.join("").length > obj.totalBulletsLength) {
                    return helper.message(`Length of all bullet points collectively should be less than ${obj.totalBulletsLength} to be fully indexed.`);
                }
                return value;
            })
            .min(0)
            .max(obj.bulletNum)
            .label("bulletpoints")
            .messages({
                "array.base": "Bulletpoints must be an array of strings",
                "array.includes": "Each bulletpoint must be a valid string according to the specified rules",
            }),

        keywords: Joi.string()
            .custom((value, helper) => {
                const { containsWords, usedWords } = containsBlacklistedWord(value, blacklistedWords);
                if (containsWords) {
                    return helper.message(`The given value contains the following blacklisted words: ||||${usedWords.join("||")}`);
                }
                return value;
            })
            .regex(/^[ -~‚„…ˆŠŽ‘’“”•\–\—˜šžŸºÀ-ÿ]*$/)
            .min(0)
            .max(obj.searchTerms)
            .custom((value, helper) => {
                if (value.length > 0 && /^\s*$/.test(value)) {
                    return helper.message(`This text only consists of whitespace, please Enter a Value.`);
                }
                return value;
            })
            .messages({
                "string.pattern.base": "These Characters Are Not Allowed",
                "string.max":"This field's length must be less than or equal to 250 characters long to fully indexed."
            }),

        category: Joi.string().required().min(0).max(200).messages({
            "string.pattern.base": "These Characters Are Not Allowed",
        }),
    });
    
    return verifyTextJoi
}
