export const checkLengthMessage = (input) => {
    const regex = /length must be less than or equal to \d{1,5} characters long to be fully indexed/;
    return regex.test(input);
}

export const checkWordsMessage = (input) => {
    const regex = /The given value contains the following blacklisted words:/;
    return regex.test(input);
}

export const checkWordsCapMessage = (input) => {
    const regex = /The given value contains words in ALL CAPS. Please correct them unless they are brand names or common spellings:/;
    return regex.test(input);
}
export const checkRepeatedWordsMessage = (input) => {
    const regex = /The below text contains the following repeated words (more than twice):/;
    return regex.test(input);
}
export const checkBulletFlag = (input) => {
    const regex = /Length of all bullet points collectively should be less than/;
    return regex.test(input);
}
export const punctuationError = (input) => {
    const regex = /These Characters Are Not Allowed/;
    return regex.test(input);
}

export const checkDemographic = (input) => {
    const regex = /properly supported with the necessary documents and approvals for your product./;
    return regex.test(input);
}