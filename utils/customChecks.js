import fs from "fs/promises";

export const findInvalidCharacters = (input, regex) => {
    let invalidChars = [];

    for (let char of input) {
        if (!regex.test(char) && !invalidChars.includes(char)) {
            invalidChars.push(char);
        }
    }
    return invalidChars.join(" ");
}
export const loadBlacklistedWords = async () => {
    const data = await fs.readFile("BW1242.csv", "utf-8");
    const words = [...new Set(data.split(/\r?\n/).map((word) => word.toLowerCase()))];
    return words;
};
export const loadAllowedAbbreviations = async () => {
    const data = await fs.readFile("AA1242.csv", "utf-8");
    const words = [...new Set(data.split(/\r?\n/).map((word) => word.toUpperCase()))];
    return words;
};

export const containsBlacklistedWord = (paragraph, blacklistedWords) => {
    const lowerCaseParagraph = paragraph.toLowerCase();
    let usedWords = [];
    let containsWords = false;

    for (const phrase of blacklistedWords) {
        const regex = new RegExp(`\\b${phrase.toLowerCase()}\\b`, "g");
        if (regex.test(lowerCaseParagraph) && !/^\s*$/.test(phrase)) {
            usedWords.push(phrase);
            containsWords = true;
        }
    }

    usedWords = [...new Set(usedWords)];

    return { containsWords, usedWords };
};

export const containsDemographic = (paragraph) =>{
    const demographics = ["kids","kid", "children","child", "teens", "teenagers", "teen", "teenager", "baby", "babies"]
    const lowerCaseParagraph = paragraph.toLowerCase();
    let usedWords = [];
    let containsWords = false;

    for (const phrase of demographics) {
        const regex = new RegExp(`\\b${phrase.toLowerCase()}\\b`, "g");
        if (regex.test(lowerCaseParagraph) && !/^\s*$/.test(phrase)) {
            usedWords.push(phrase);
            containsWords = true;
        }
    }

    usedWords = [...new Set(usedWords)];

    return { containsWords, usedWords };
}

export const containsHoliday = (paragraph) =>{
    const demographics = ["New Year's Day","Valentine's Day","Mother's Day","Father's Day","Christmas Day","Easter Sunday","Thanksgiving Day","Halloween","Independence Day","Labor Day","Memorial Day","Martin Luther King Jr. Day","Presidents' Day","St. Patrick's Day","Cinco de Mayo","Hanukkah","Diwali","Ramadan","Eid al-Fitr","Eid al-Adha","Chinese New Year","Thanksgiving Friday","Boxing Day","Groundhog Day","April Fool's Day","Earth Day","Veterans Day","Columbus Day","Juneteenth","Canada Day","Australia Day","Bastille Day","Day of the Dead","Mardi Gras","Ash Wednesday","Good Friday","Passover","Rosh Hashanah","Yom Kippur","Kwanzaa","International Women's Day","Children's Day","Teacher's Day","Grandparents' Day","Arbor Day","National Siblings Day","National Pet Day","World Health Day","World Environment Day","International Workers' Day","christmas"]
    const lowerCaseParagraph = paragraph.toLowerCase();
    let usedWords = [];
    let containsWords = false;

    for (const phrase of demographics) {
        const regex = new RegExp(`\\b${phrase.toLowerCase()}\\b`, "g");
        if (regex.test(lowerCaseParagraph) && !/^\s*$/.test(phrase)) {
            usedWords.push(phrase);
            containsWords = true;
        }
    }

    usedWords = [...new Set(usedWords)];

    return { containsWords, usedWords };
}

export const containsAllCapsWords = (str, allowedAbbreviations) => {
    const words = str.split(" ");
    let cappedWords = [];
    let containsCaps = false;

    let allowedWords = [...allowedAbbreviations];

    for (let word of words) {
        if (/^[A-Z]+$/.test(word) && word.length > 2 && !allowedWords.includes(word)) {
            cappedWords.push(word);
            containsCaps = true;
        }
    }
    cappedWords = [...new Set(cappedWords)];
    return { containsCaps, cappedWords };
}



export const findRepeatedWords = (input) => {
    const ignoredWords = new Set([
        "and", "or", "but", "nor", "so", "for", "yet", "a", "an", "the", "in", "on", "at", "by", "to", "with", "of", "from", "about", "as", "into", "like", "through", "after", "over", "between", "out", "against", "during", "without", "within", "upon", "under", "around", "among", "it", "had", "he", "she", "they", "we", "you", "I", "me", "him", "her", "us", "them", "my", "your", "his", "its", "their", "our", "this", "that", "these", "those", "what", "which", "who", "whom", "whose", "where", "when", "why", "how", "if", "while", "although", "because", "before", "until", "since", "whether", "though", "once", "unless", "wherever", "whenever", "both", "either", "neither", "each", "every", "some", "any", "no", "few", "several", "all", "many", "most", "none", "such"
    ]);
    
    const words = input.toLowerCase().split(/\W+/).filter(word => word && !ignoredWords.has(word));
    const wordCount = new Map();
    const repeatedWords = new Set();
    
    for (const word of words) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
        if (wordCount.get(word) > 2) {
            repeatedWords.add(word);
        }
    }
    
    return Array.from(repeatedWords);
}