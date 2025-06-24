import { Router } from "express";
import multer from "multer";
import { verifyJWT, verifyAdmin } from "../middleware/app.middleware.js";
import {
    getUser,
    getWords,
    addWords,
    uploadCsv,
    getThread,
    getIncome,
    makeAdmin,
    removeWords,
    changeRules,
    getAllUsers,
    downloadCsv,
    getAbbWords,
    addAbbWords,
    creditsUsed,
    uploadAbbCsv,
    getAssistants,
    getTotalUsers,
    analysisgraph,
    checkAssistant,
    downloadAbbCsv,
    removeAbbWords,
    getUserHistory,
    deleteAssistant,
    giveUserCredits,
    takeUserCredits,
    getUserPurchases,
    toggleUserAccount,
    getAssInstructions,
    changeOfferPricing,
    updateAssInstructions,
    updateAssInstructionsV2,
    updateAssistantValidator
} from "../controllers/admin.controller.js";

const upload = multer({ dest: "./" });
const router = Router();

router.route("/words").get(getWords);

router.route("/words").post(addWords);

router.route("/words").delete(verifyJWT, verifyAdmin, removeWords);

router.route("/csv").post(upload.single("file"), uploadCsv);

router.route("/csv").get(downloadCsv);

router.route("/abbwords").get(getAbbWords);

router.route("/abbwords").post(addAbbWords);

router.route("/abbwords").delete(verifyJWT, verifyAdmin, removeAbbWords);

router.route("/abbcsv").post(upload.single("file"), uploadAbbCsv);

router.route("/abbcsv").get(downloadAbbCsv);

router.route("/getAllUsers").get(verifyJWT, verifyAdmin, getAllUsers);

router.route("/toggleUserAccount").get(verifyJWT, verifyAdmin, toggleUserAccount);

router.route("/getspecificUser").get(verifyJWT, verifyAdmin, getUser);

router.route("/rules").post(verifyJWT, verifyAdmin, changeRules);

router.route("/gethistory").get(verifyJWT, verifyAdmin, getUserHistory);

router.route("/getuserpurchases").get(verifyJWT, verifyAdmin, getUserPurchases);

router.route("/getTotalUsers").get(verifyJWT, verifyAdmin, getTotalUsers);

router.route("/getIncome").get(verifyJWT, verifyAdmin, getIncome);

router.route("/offers").post(verifyJWT, verifyAdmin, changeOfferPricing);

router.route("/givecredits").post(verifyJWT, verifyAdmin, giveUserCredits);

router.route("/takecredits").post(verifyJWT, verifyAdmin, takeUserCredits);

router.route("/analysisgraph").get(verifyJWT, verifyAdmin, analysisgraph);

router.route("/assistant").get(verifyJWT, verifyAdmin, getAssInstructions);

// router.route("/assistant").post(verifyJWT, verifyAdmin, updateAssInstructions);

router.route("/assistant").post(verifyJWT, verifyAdmin, updateAssInstructionsV2);

router.route("/makeAdmin").get(verifyJWT, verifyAdmin, makeAdmin);

router.route("/getCredits").get(verifyJWT, verifyAdmin, creditsUsed);

router.route("/assistant/validator").get(updateAssistantValidator)

router.route("/deleteAssistant").get(deleteAssistant);

router.route("/getAssistants").get(getAssistants);

router.route("/checkAssistant").get(checkAssistant);

router.route("/getThread").post(getThread);

export default router;
