import Joi from "joi";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";
import { History } from "../models/history.model.js";
import Stripe from "stripe";
import { User } from "../models/user.model.js";
import { ProcessedEvent } from "../models/webhook.model.js";
import { Offer } from "../models/offers.model.js";
import { transporterConstructor } from "../utils/email.js";
import { analyzeValue } from "../services/AIService.js";

const transporter = transporterConstructor();

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const assId = "asst_J8gYM42wapsrXpntcCLMe8wJ";

const loadBlacklistedWords = async () => {
    const data = await fs.readFile("blacklistedWords.csv", "utf-8");
    const words = new Set(
        data.split(/\r?\n/).map((word) => word.toLowerCase())
    );
    return words;
};

const blacklistedWords = await loadBlacklistedWords();

function findInvalidCharacters(input, regex) {
    let invalidChars = [];

    for (let char of input) {
        if (!regex.test(char) && !invalidChars.includes(char)) {
            invalidChars.push(char);
        }
    }
    return invalidChars.join(" ");
}

const containsBlacklistedWord = (paragraph) => {
    const lowerCaseParagraph = paragraph.toLowerCase();
    let usedWords = [];
    let containsWords = false;

    for (const phrase of blacklistedWords) {
        const regex = new RegExp(`\\b${phrase.toLowerCase()}\\b`, "g");
        if (regex.test(lowerCaseParagraph)) {
            usedWords.push(phrase);
            containsWords = true;
        }
    }

    usedWords = [...new Set(usedWords)];

    return { containsWords, usedWords };
};

// const correctCapitalisations = (paragraph) => {
//     console.log(paragraph);
//     const exceptions = ["a","an","the","accordingly","after","also","before","besides","consequently","conversely","finally","furthermore","hence","however","indeed","instead","likewise","meanwhile","moreover","nevertheless","next","nonetheless","otherwise","similarly","still","subsequently","then","therefore","thus","for","and","nor","but","or","yet","so","about","like","above","near","across","of","after","off","against","on","along","onto","among","opposite","around","out","as","outside","at","over","before","past","behind","round","below","since","beneath","than","beside","through","between","to","beyond","towards","by","under","despite","underneath","down","unlike","during","until","except","up","for","upon","from","via","in","with","inside","within","into","without",];
//     const fixed = paragraph.split("-").join(" ");
//     const words = fixed.split(" ");

//     let check = true;
//     let checkArray = [];

//     for (let i = 0; i < words.length; i++) {
//         const word = words[i];
//         const lowerWord = word.toLowerCase();

//         if (word) {
//             if (exceptions.includes(lowerWord)) {
//                 if (word !== lowerWord) {
//                     checkArray.push(word);
//                     check = false;
//                 }
//             } else {
//                 if (
//                     word[0] !== word[0].toUpperCase() ||
//                     word.slice(1) !== word.slice(1).toLowerCase()
//                 ) {
//                     checkArray.push(word);
//                     check = false;
//                 }
//             }
//         }
//     }

//     return { check, checkArray };
// };

function containsAllCapsWords(str) {
    const acceptedAbbreviations = ["RGB","OLED","LED","USB","HDMI","LCD","SSD","DDR","GPU","CPU","AI","AC","DC","UV","IR","HD","VR","AR","FM","AM","FAQ","PVC","ABS","NFC","RFID","LG","RFID","AND","NAND","OS","OMDIA","NOT","XOR","XNOR","OR","NOR","AMD","WiFi","RAM","ROM","SD","TF","CCTV","GPS","DPI","PPI","USB-C","VGA","DVI","SATA","PCIe","HDCP","HDR","UHD","QLED","IPS","MP","FPS","Mbps","Gbps","TB","GB","MHz","GHz","mAh","Li-ion","Li-Po","PSU","UPS","POE","VoIP","AIoT","IoT","CAT5","CAT6","FTTH","EPUB","PDF","USB","MIMO","BPSK","QPSK","FHD","WQHD","TFT","LGA","SO-DIMM","mSATA","NVMe","APU","FPU","AVR","DLP","DMX","IP","ISP","DSP","PMP","TV","PTZ","STB","OIS","XLR","MIDI","BNC","SFP","MAC","WAN","LAN","VLAN","SSL","HTTPS","DNS","DHCP","IC","PWM","LDO","BMS","OLED","CAGR","TPU","TDP","RMS","THD","I2C","SPI","UART","TTL","HDMI","DP","DTS","DAC","ADC","JTAG","SOC","BIOS","UFS","PD","QC","LED TV","8K","DND","DIY","FAT32","NTFS","EXT4","HDD","RAID","E-ATX","MID","OD","LED","AV","S/PDIF","LLC","RoHS","UL","FCC","CE","API","GUI","CLI","CD","DVD","BD","USB 4.0","MHL","XGA","WXGA","QR","NVR","NAS","ECC","SAS","GDDR","SMD","MOSFET","IGBT","VFD","HMI","AP","SSID","WPA","WPA2","WPA3","LTE","3G","4G","5G","SIM","eSIM","CMOS","CCD","LIDAR","SONAR","SISO","PON","AIO","ODI","CDN","TLS","AES","DES","IPX","ATM","PTP","XMPP","SSH","SMTP","POP3","IMAP","PSTN","POTS","BPS","RF","EMI","EMC","EIRP","SMPS","BLE","COFDM","QAM","OFDM","FDD","TDD","TDMA","FDMA","SDR","EPC","ESD","ACPI","DVI-D","DVI-I","XMP","RS-232","RS-485","USB-PD","M.2","QHD","XQD","UHS","NVM","ATA","IDE","GSM","CDMA","WCDMA","VoLTE","IPTV","TFT-LCD","OLED-QLED","DCR","ICR","HFR","ITX","ZIF","PDIP","SOIC","QFN","BGA","PCB","RFQ","RFP","OEM","ODM","COTS","MMU","DMA","VPN","VPS","SLA","QoS","RISC","CISC","IOT","ML","NLP","VPU","AI","MIC","DVR","CVR","MLC","TLC","QLC","UVLO","OTP","DLNA","HSI","CSI","PIR","GPIO","RTC","PFC","PMIC","VCXO","LVDS","SDIO","WiDi","UWB","Z-Wave","Zigbee","SATA","SFP+","QFP","HVAC","PDM","DFT","DFA","DC-DC","OP-AMP","PLL","SNR","THX","IPFS","EIGRP","OSPF","BGP","MPLS","NAT","PAT","ACL","IDS","AVC","HEVC","H.264","H.265","SDXC","SMB","CIFS","SFTP","BTS","RTOS","FAT","EXIF","LGA1151","VESA","MIPI","RTP","RTCP","HLS","DASH","SIP","SVC","MP3","WAV","AAC","FLAC","OPUS","TWS","ANC","UPnP","IMU","DMP","MSP","PABX","PBX","CATV","IFTTT","FMC","APC","SMSC"];

    const words = str.split(" ");
    let cappedWords = [];
    let containsCaps = false;

    for (let word of words) {
        if (
            /^[A-Z]+$/.test(word) &&
            word.length > 1 &&
            !acceptedAbbreviations.includes(word)
        ) {
            cappedWords.push(word);
            containsCaps = true;
        }
    }
    cappedWords = [...new Set(cappedWords)];
    return { containsCaps, cappedWords };
}

// function detectNumberWords(text) {
//     const singleDigits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
//     const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
//     const tens = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
//     const hundreds = ["hundred"];
//     const thousands = ["thousand"];

//     const allNumberWords = [...singleDigits, ...teens, ...tens, ...hundreds, ...thousands];

//     const lowerText = text.toLowerCase();

//     const numberWordPattern = new RegExp(`\\b(${allNumberWords.join("|")})\\b`, "gi");

//     const matches = lowerText.match(numberWordPattern);

//     return matches !== null;
// }

const obj = JSON.parse(await fs.readFile("json/rules.json", "utf8"));

const paymentEmailJoi = Joi.object({
    email: Joi.string().required().email(),
    name: Joi.string().required().min(2),
    credits: Joi.number().required().min(1),
    paymentDetails: Joi.string().required(),
});

function mergeObjects(obj1, obj2) {
    const result = { ...obj2 }; 
    for (const key in obj1) {
        const value1 = obj1[key];
        if (value1 === "" || (Array.isArray(value1) && value1.length === 0)) {
            if (!obj2.hasOwnProperty(key)) {
                result[key] = value1;
            }
        } else {
            result[key] = value1;
        }
    }
    return result;
}

export const verifyText = async (req, res) => {
    try {
        let { title, description, bulletpoints, keywords, category } = req.body;

        console.log(`${keywords}`);
        if (!category) return res.status(400).json({ success: false, message: "category is required" });

        const verifyTextJoi = Joi.object({
            title: Joi.string()
                .custom((value, helper) => {
                    const { containsWords, usedWords } =
                        containsBlacklistedWord(value);
                    if (containsWords) {
                        return helper.message(
                            `this text contains the words: (${usedWords.map(
                                (word) => " " + word
                            )} ) which are blacklisted`
                        );
                    }
                    return value;
                })
                .regex(/^[ -~–—―‑֊־‐‒−⎴─━➖⸏ㅣㅡー一⁃ᐨ－﹣⸻⸺]*$/)
                .min(0)
                .max(obj[category] + 1)
                // .custom((value,helper)=>{
                //     const {check,checkArray} = correctCapitalisations(value)
                //     if(!check){
                //         return helper.message(`Incorrect capitalizations found: (${checkArray.join(', ')})`)
                //     }
                //     return value
                // })
                .custom((value, helper) => {
                    if (value.length > 0 && /^\s*$/.test(value)) {
                        return helper.message(
                            `this text only consists of whitespace, please Enter a Value`
                        );
                    }
                    return value;
                })
                .messages({
                    "string.pattern.base": "These Characters Are Not Allowed",
                    "string.max": `title for category: "${category}" must be less than ${obj[category]} characters long`,
                }),

            description: Joi.string()
                .custom((value, helper) => {
                    const { containsWords, usedWords } =
                        containsBlacklistedWord(value);
                    if (containsWords) {
                        return helper.message(
                            `this text contains the words: (${usedWords.map(
                                (word) => " " + word
                            )} ) which are blacklisted`
                        );
                    }
                    return value;
                })
                .regex(/^[ -~–—―‑֊־‐‒−⎴─━➖⸏ㅣㅡー一⁃ᐨ－﹣⸻⸺]*$/)
                .min(0)
                .max(obj.descriptionCharacters)
                .messages({
                    "string.pattern.base": "These Characters Are Not Allowed",
                })
                .custom((value, helper) => {
                    const { containsCaps, cappedWords } =
                        containsAllCapsWords(value);
                    if (containsCaps) {
                        return helper.message(
                            `The given value has words that are in all caps: (${cappedWords.map((word) => " " + word)} )`
                        );
                    }
                    return value;
                })
                .custom((value, helper) => {
                    if (value.length > 0 && /^\s*$/.test(value)) {
                        return helper.message(
                            `this text only consists of whitespace, please Enter a Value`
                        );
                    }
                    return value;
                })
                .custom((value, helper) => {
                    if (
                        (category !== "Books" &&
                            /<(?!\/?br\s*\/?>)[^>]*>/g.test(value)) ||
                        (category === "Books" && /<[^>]+>/g.test(value))
                    ) {
                        return helper.message(
                            "Only <br> tags are allowed outside the 'Books' category."
                        );
                    }
                    return value;
                }),

            bulletpoints: Joi.array()
                .items(
                    Joi.string()
                        .allow("")
                        .custom((value, helper) => {
                            const { containsWords, usedWords } =
                                containsBlacklistedWord(value);
                            if (containsWords) {
                                return helper.message(
                                    `this text contains the words: (${usedWords.map(
                                        (word) => " " + word
                                    )} ) which are blacklisted`
                                );
                            }
                            return value;
                        })
                        .custom((value, helper) => {
                            if (value.length > 0 && /^\s*$/.test(value)) {
                                return helper.message(
                                    `this text only consists of whitespace, please Enter a Value`
                                );
                            }
                            return value;
                        })
                        .regex(/^[ -~–—―‑֊־‐‒−⎴─━➖⸏ㅣㅡー一⁃ᐨ－﹣⸻⸺]*$/)
                        .min(0)
                        .max(obj.bulletCharacters)
                        .messages({
                            "string.pattern.base":"These Characters Are Not Allowed",
                            "string.max":"length must be less than or equal to 250 characters long to be fully indexed",
                        })
                        .custom((value, helper) => {
                            const { containsCaps, cappedWords } =
                                containsAllCapsWords(value);
                            if (containsCaps) {
                                return helper.message(
                                    `The given value has words that are in all caps: (${cappedWords.map(
                                        (word) => " " + word
                                    )} )`
                                );
                            }
                            return value;
                        })
                )
                .custom((value, helper) => {
                    if (value.join("").length > obj.totalBulletsLength) {
                        return helper.message(
                            `length of all bullet points collectively should be less than ${obj.totalBulletsLength} to be fully indexed`
                        );
                    }
                    return value;
                })
                .min(0)
                .max(obj.bulletNum)
                .label("bulletpoints")
                .messages({
                    "array.base": "bulletpoints must be an array of strings",
                    "array.includes":
                        "each bulletpoint must be a valid string according to the specified rules",
                }),

            keywords: Joi.string()
                .custom((value, helper) => {
                    const { containsWords, usedWords } =
                        containsBlacklistedWord(value);
                    if (containsWords) {
                        return helper.message(
                            `this text contains the words: (${usedWords.map(
                                (word) => " " + word
                            )} ) which are blacklisted`
                        );
                    }
                    return value;
                })
                .regex(/^[ -~–—―‑֊־‐‒−⎴─━➖⸏ㅣㅡー一⁃ᐨ－﹣⸻⸺]*$/)
                .min(0)
                .max(obj.searchTerms)
                .custom((value, helper) => {
                    if (value.length > 0 && /^\s*$/.test(value)) {
                        return helper.message(
                            `this text only consists of whitespace, please Enter a Value`
                        );
                    }
                    return value;
                })
                .messages({
                    "string.pattern.base": "These Characters Are Not Allowed",
                }),

            category: Joi.string().required().min(0).max(200).messages({
                "string.pattern.base": "These Characters Are Not Allowed",
            }),
        });

        bulletpoints = bulletpoints.map((e) => {
            return e.value;
        });
        bulletpoints = bulletpoints.filter((e) => e);

        title = title.replace(/[\x00-\x1F]/g, "");
        description = description.replace(/[\x00-\x1F]/g, "");
        bulletpoints = bulletpoints.map((e) => e.replace(/[\x00-\x1F]/g, ""));
        keywords = keywords.replace(/[\x00-\x1F]/g, "");
        category = category.replace(/[\x00-\x1F]/g, "");

        let collectiveString = title + description + bulletpoints.join("") + keywords;

        const calcStringCost = (stringToCalc) => {
            const fullChunks = Math.floor(
                stringToCalc.length / obj.characterCost
            );
            const partialChunk = stringToCalc.length % obj.characterCost;
            const valtosend = Math.ceil(
                fullChunks * obj.creditCost +
                    (partialChunk > 0
                        ? (partialChunk / obj.characterCost) * obj.creditCost
                        : 0)
            );
            return valtosend;
        };

        const creditPrice =
            calcStringCost(title) +
            calcStringCost(description) +
            calcStringCost(bulletpoints.join("")) +
            calcStringCost(keywords);

        let user = await User.findOne({ email: req.user.email });

        if (user.credits < creditPrice) {
            if (user.autocharge == true) {
                const paymentMethods =
                    await stripe.customers.listPaymentMethods(
                        req.user.customerId
                    );
                const paymentId = paymentMethods.data[0].id;

                if (!paymentId) {
                    return res
                        .status(400)
                        .json({
                            message:
                                "No Payment Method Detected, add credits, or add payment method",
                            success: false,
                        });
                }

                const offer = await Offer.findOne({ variant: -1 });

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: user.preferredCredits * offer.amount,
                    currency: "usd",
                    customer: req.user.customerId,
                    payment_method: paymentId,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        variant: -1,
                        credits: user.preferredCredits,
                    },
                });

                user = await User.findOne({ email: req.user.email });

                if (user.credits + user.preferredCredits < creditPrice) {
                    return res
                        .status(400)
                        .json({
                            message:
                                "your Auto Credits are not enough to cover for this analyzation, please recharge",
                            success: false,
                            error: {},
                        });
                }
            } else {
                return res
                    .status(400)
                    .json({
                        message: "Not enough credits, please recharge",
                        success: false,
                        error: {},
                    });
            }
        }

        user.credits -= creditPrice;
        user.save();

        const { error } = verifyTextJoi.validate(
            { title, description, bulletpoints, keywords, category },
            { abortEarly: false }
        );

        let errObj = {
            TE: [],
            DE: [],
            BE: [],
            KE: [],
            CE: [],
        };

        if (error) {
            error.details.forEach((field) => {
                const fieldKeyMap = {
                    title: "TE",
                    description: "DE",
                    bulletpoints: "BE",
                    keywords: "KE",
                    category: "CE",
                };
                const fieldKey = fieldKeyMap[field.path[0]];

                console.log("path", field.path[0] == "bulletpoints");

                if (field.type === "string.pattern.base") {
                    const invalidChars = findInvalidCharacters(
                        field.context.value,
                        field.context.regex
                    );
                    field.message = `${field.message}: ${invalidChars}`;
                }

                if (field.path[0] == "bulletpoints") {
                    console.log("hoi");
                    errObj.joi = true;

                    let exists = false;

                    errObj[fieldKey].forEach((e) => {
                        if (e.point == field.path[1] + 1) {
                            e.message = e.message + `|-|${field.message}`;
                            exists = true;
                        }
                    });

                    if (!exists) {
                        errObj[fieldKey].push({
                            point: field.path[1] + 1 || -10,
                            message: field.message,
                        });
                    }
                } else {
                    errObj[fieldKey].push(field.message);
                }
            });
        }

        // let latest_message;
        // const { thread_id, id } = await openai.beta.threads.createAndRun({assistant_id: assId,});
        // console.log("threadId", thread_id);
        // let threadrun = await openai.beta.threads.runs.retrieve(thread_id, id);

        // while (
        //     threadrun.status === "running" ||
        //     threadrun.status === "queued" ||
        //     threadrun.status === "in_progress"
        // ) {
        //     console.log("waiting for completion");
        //     await new Promise((resolve) => setTimeout(resolve, 1000));
        //     threadrun = await openai.beta.threads.runs.retrieve(
        //         thread_id,
        //         threadrun.id
        //     );
        //     console.log(`threadrun status: ${threadrun.status}`);
        // }

        // const message = await createMessage(thread_id,"user",`TITLE: ${title} DESCRIPTION:${description} BULLETPOINTS:${bulletpoints.map((e) => ` -${e}`).join("")}`);

        // let run = await createRun(thread_id, assId);
        // console.log(`run created: ${run.id} at ${thread_id}`);

        // while (
        //     run.status === "running" ||
        //     run.status === "queued" ||
        //     run.status === "in_progress"
        // ) {
        //     console.log("waiting for completion");
        //     await new Promise((resolve) => setTimeout(resolve, 1000));
        //     run = await openai.beta.threads.runs.retrieve(thread_id, run.id);
        //     console.log(`run status: ${run.status}`);
        // }
        // console.log(`run completed: ${run.id}`);

        // const message_response = await openai.beta.threads.messages.list(
        //     thread_id
        // );
        // const messages = message_response.data;

        // latest_message = messages[0]?.content[0]?.text?.value;

        // // Clean the JSON string properly
        // latest_message = latest_message
        //     ?.replace(/```json/g, "")
        //     ?.replace(/```/g, "")
        //     ?.replace(/\\n/g, "")
        //     ?.trim();
        // console.log("msg", latest_message);

        // latest_message = latest_message.replace(/[\x00-\x1F]/g, "");
        // const parsedMessage = JSON.parse(latest_message);

        //head if a field's key-value pair in errObj does not exist, add it using the analyzeValue() function

        const errors = []

        if(errObj.TE.length == 0&&title!=''){
            errors.push(await analyzeValue(title, 'title'))
        }
        if(errObj.DE.length == 0&&description!=''){
            errors.push(await analyzeValue(description, 'desc'))
        }
        if(errObj.BE.length == 0&&bulletpoints.length>0&&bulletpoints[0]!=''){
            errors.push(await analyzeValue(bulletpoints, 'bullets'))
        }
        // const parsedMessage = Object.assign({}, ...(await Promise.all(errors)));
        // const results = await Promise.all(errors);
        const parsedMessage = Object.assign({}, ...errors);

        console.log('message data',parsedMessage)

        const changedObject = {
            TE: parsedMessage.titleErrors || [],
            TF: parsedMessage.titleFixed || [],
            DE: parsedMessage.descriptionErrors || [],
            DF: parsedMessage.descriptionFixed || [],
            BE: parsedMessage.bulletPointErrors || [],
            BF: parsedMessage.bulletPointFixed || []
        };

        console.log(changedObject)

        const mergedObject = mergeObjects(errObj, changedObject);

        const newHistory = await History.create({
            userID: req.user.id,
            title,
            description,
            bullets: bulletpoints,
            keywords,
            error: mergedObject,
        });

        console.log(newHistory);

        return res.status(200).json({message: "text verified",error: mergedObject,success: true});
        // res.json({error:{TE:["hi"],BE:[""],KE:[""],CE:[""],DE:[""]},message:"success"})
        // res.json({message:"success",errObj})
    } catch (error) {
        if (error.code == "authentication_required") {
            return res.status(200).json({message: "not enough credits, autopay failed, authentication required",success: false,});
        } else {
            console.log(error);
            return res.status(400).json({message: "something went wrong, please try again or contact support",success: false,});
        }
    }
};

export const generateThread = async (req, res) => {
    try {
        const emptyThread = await openai.beta.threads.createAndRun({
            assistant_id: assId,
        });

        return res.json({ thread: emptyThread });
    } catch (err) {
        console.log(err);
        return res.json(err);
    }
};

// async function createRun(thread_id, assistantId) {
//     const run = await openai.beta.threads.runs.create(thread_id, {
//         assistant_id: assistantId,
//     });

//     return run;
// }

// async function createMessage(thread_id, role, content) {
//     const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//     const threadMessages = await openai.beta.threads.messages.create(
//         thread_id,
//         {
//             role,
//             content,
//         }
//     );
//     return threadMessages;
// }

export const getUserHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const Histories = await History.find({ userID: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalHistories = await History.countDocuments({
            userID: req.user.id,
        });

        res.status(200).json({
            success: true,
            page,
            limit,
            totalHistories,
            totalPages: Math.ceil(totalHistories / limit),
            Histories,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const getUser = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.query.email });
        res.status(200).json({ user });
    } catch (error) {
        console.log(error);
    }
};

export const buyCredits = async (req, res) => {
    try {
        const { variant, email } = req.body;

        if (!variant || !email) {
            return res.status(400).json({ message: "data incomplete" });
        }

        const user = await User.findOne({ email: req.user.email });

        if (!user.customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.userName,
            });

            user.customerId = customer.id;
            req.user.customerId = customer.id;
            user.save();
            console.log(user);
        }

        const offer = await Offer.findOne({ variant });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: offer.amount,
            currency: "usd",
            automatic_payment_methods: {
                enabled: true,
            },
            customer: req.user.customerId,
            metadata: {
                variant,
                credits: offer.credits,
            },
            payment_method_options: {
                card: {
                    setup_future_usage: "off_session",
                },
            },
        });

        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            success: true,
        });
    } catch (error) {
        console.log(error);
    }
};

export const addPaymentMethod = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });

        if (!user.customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.userName,
            });

            user.customerId = customer.id;
            req.user.customerId = customer.id;
            user.save();
            console.log(user);
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: req.user.customerId,
            automatic_payment_methods: { enabled: true },
        });
        console.log(setupIntent);
        res.status(200).json({
            success: true,
            clientSecret: setupIntent.client_secret,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const BuyCreditWebhook = async (req, res) => {
    try {
        const details = req.body.data.object;
        if (!details || details.object == "charge") {
            return res.status(400).json({ message: "Invalid webhook data" });
        }

        let webhookCall = await ProcessedEvent.findOne({ id: details.id });

        if (webhookCall) {
            return res.status(200).json({ message: "webhook already called" });
        }

        webhookCall = await ProcessedEvent.create({ id: details.id });

        const user = await User.findOne({ customerId: details.customer });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const variant = Number(details.metadata.variant);

        user.credits = Number(user.credits) + Number(details.metadata.credits);
        await user.save();

        return res.status(200).json({ success: true, credits: user.credits });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getPurchaseHistory = async (req, res) => {
    try {
        const { customerId } = req.user;
        if (!customerId) {
            return res.status(200).json({ payments: [] });
        }
        const charges = await stripe.charges.list({ customer: customerId });

        let payments = charges.data.map((e) => {
            return {
                id: e.id,
                currency: e.currency,
                amount: e.amount,
                currency: e.currency,
                credits: e.metadata.credits,
                date: e.created,
                status: e.status,
            };
        });

        payments = payments.filter((e) => e.status === "succeeded");

        return res.status(200).json({ success: true, payments });
    } catch (error) {
        console.log(error);
    }
};

export const numberOfAnalysed = async (req, res) => {
    try {
        const count = await History.countDocuments({ userID: req.user.id });
        res.status(200).json({ success: true, count });
    } catch (error) {
        console.log(error);
    }
};

export const getCardInfo = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });

        console.log(user);

        if (!req.user.customerId) {
            return res.status(200).json({ message: "no customer detected" });
        }
        const paymentMethods = await stripe.customers.listPaymentMethods(
            req.user.customerId
        );

        // console.log(req.user,paymentMethods)
        const cards = paymentMethods.data.map((e) => {
            return {
                expMonth: e.card.exp_month,
                expYear: e.card.exp_year,
                last4: e.card.last4,
            };
        });
        res.status(200).json({ cards });
    } catch (error) {
        console.log(error);
    }
};

export const toggleAutoCredit = async (req, res) => {
    try {
        const { preferredCredits } = req.query;
        console.log(preferredCredits);
        if (preferredCredits < 0) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "preferred Credits can not be less than 0",
                });
        }
        const user = await User.findOne({ email: req.user.email });
        const uac = user.autocharge;
        user.autocharge = !user.autocharge;
        user.preferredCredits = preferredCredits;
        user.save();
        return res
            .status(200)
            .json({
                success: true,
                message: `auto credits: ${uac ? "off" : "on"}`,
            });
    } catch (err) {
        console.log(err);
    }
};

export const getGraphData = async (req, res) => {
    try {
        const userId = req.user.id;
        const histories = await History.find({
            userID: userId,
            createdAt: { $gte: new Date(Date.now() - 15768000000) },
        });

        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        const monthlyCredits = {};

        histories.forEach((history) => {
            const month = monthNames[history.createdAt.getMonth()];
            if (!monthlyCredits[month]) {
                monthlyCredits[month] = 0;
            }
            monthlyCredits[month] += history.credits;
        });

        const result = Object.keys(monthlyCredits).map((month) => ({
            name: month,
            credits: monthlyCredits[month],
        }));

        res.status(200).json(result);
    } catch (err) {
        console.log(err);
    }
};

export const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find();
        res.status(200).json({ success: true, offers });
    } catch (err) {
        console.log(err);
        return res
            .status(500)
            .json({
                message:
                    "something went wrong, please try again later or contact support",
            });
    }
};

export const getRules = async (req, res) => {
    try {
        const obj = JSON.parse(await fs.readFile("json/rules.json", "utf8"));
        res.status(200).json(obj);
    } catch (err) {
        console.log(err);
        return res
            .status(500)
            .json({
                message:
                    "something went wrong, please try again or contact support",
            });
    }
};

export const paymentEmail = (req, res) => {
    try {
        const { error } = paymentEmailJoi.validate(req.body);

        if (error) {
            console.log(error);
            return res
                .status(400)
                .json({ success: false, message: "invalid data provided" });
        }

        const { email, name, credits, paymentDetails } = req.body;

        transporter.sendMail({
            to: "haris.markcoders@gmail.com",
            subject: "payment request",
            text: `
            
            sender: ${email}
            name: ${name}
            number of credits Requested: ${credits}

            ${paymentDetails}
            
            `,
        });
        res.status(200).json({
            success: true,
            message: "email sent successfully",
        });
    } catch (error) {
        console.log(err);
        return res
            .status(500)
            .json({
                message:
                    "something went wrong, please try again or contact support ... directly.",
            });
    }
};

export const getMessage = (req, res) => {
    run_9yI0Bp8yzlRziVarpSO6dquG;
};
