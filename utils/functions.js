export const joinStrings = (array) => {
    const quotedArray = array.map(str => `"${str}"`); // Wrap each element in quotes
    if (quotedArray.length === 0) return "";
    if (quotedArray.length === 1) return quotedArray[0];
    if (quotedArray.length === 2) return quotedArray.join(" and ");

    const allButLast = quotedArray.slice(0, -1).join(", ");
    const last = quotedArray[quotedArray.length - 1];
    return `${allButLast} and ${last}`;
}


export const mergeObjects = (obj1, obj2) => {
    const merged = { ...obj1 };

    for (const key in obj2) {
        if (Array.isArray(obj2[key])) {
            merged[key] = Array.isArray(merged[key]) ? merged[key].concat(obj2[key]) : obj2[key];
        } else if (typeof obj2[key] === "boolean") {
            merged[key] = merged[key] === undefined ? obj2[key] : merged[key] || obj2[key];
        } else if (!(key in merged)) {
            merged[key] = obj2[key];
        }
    }

    return merged;
}